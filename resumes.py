import os
import re
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import Resume, ResumeAnalysis, AuditEvent, User
from app.schemas.all_schemas import ResumeResponse
from app.api.auth import get_current_user
from app.core.config import settings
from app.services.resume_parser import resume_parser

router = APIRouter(prefix="/resumes", tags=["Resumes"])

# Magic byte signatures for allowed file types
FILE_SIGNATURES = {
    "pdf":  [b"%PDF-"],
    "docx": [b"PK\x03\x04"],
    "png":  [b"\x89PNG"],
    "jpg":  [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "webp": [b"RIFF"],  # RIFF....WEBP
    "bmp":  [b"BM"],
}

def _sanitize_filename(raw_filename: str) -> str:
    """Extract base filename and remove any path traversal or illegal characters."""
    base = Path(raw_filename).name  # strip directory components
    # Remove any remaining traversal or control characters
    sanitized = re.sub(r'[^\w\s\-\.\(\)]', '_', base)
    return sanitized.strip() or "unnamed_file"

def _validate_file_signature(file_bytes: bytes, ext: str) -> bool:
    """Validate that file bytes match expected magic byte signature for the extension."""
    signatures = FILE_SIGNATURES.get(ext, [])
    if not signatures:
        return True  # no signature check available
    for sig in signatures:
        if file_bytes[:len(sig)] == sig:
            # Extra check for WEBP: bytes 8-12 must be 'WEBP'
            if ext == "webp" and len(file_bytes) >= 12:
                return file_bytes[8:12] == b"WEBP"
            return True
    return False

@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and parse a PDF, DOCX, or image resume document.
    Validates file extension, magic bytes, size limit, and extracts initial readable text.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    # Sanitize filename — use only the basename, strip traversal
    safe_original = _sanitize_filename(file.filename)
    ext = safe_original.rsplit(".", 1)[-1].lower() if "." in safe_original else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '.{ext}'. Supported formats are: {', '.join(settings.ALLOWED_EXTENSIONS).upper()}"
        )

    # Read bytes and enforce size limit BEFORE writing to disk
    file_bytes = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
        )

    # Validate actual file type/signature (magic bytes)
    if not _validate_file_signature(file_bytes, ext):
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match expected format for '.{ext}'. The file may be corrupted or disguised."
        )

    # Generate storage filename independently — never include user-supplied filename
    storage_filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = settings.UPLOAD_DIR / storage_filename
    try:
        with open(file_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store resume: {str(e)}")

    # Extract text from document
    try:
        parsed_doc = resume_parser.parse_document(file_bytes, ext)
        extracted_text = parsed_doc["raw_text"]
        proc_status = "parsed"
    except Exception as e:
        # Delete stored file on parse failure
        if file_path.exists():
            try:
                os.remove(file_path)
            except Exception:
                pass
        extracted_text = f"Text extraction warning: {str(e)}"
        proc_status = "extraction_error"

    resume = Resume(
        user_id=current_user.id,
        original_filename=safe_original,
        storage_key=storage_filename,
        extracted_text=extracted_text,
        file_type=ext,
        processing_status=proc_status
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        event_type="RESUME_UPLOADED",
        resource_type="Resume",
        resource_id=resume.id
    )
    db.add(audit)
    db.commit()

    return ResumeResponse(
        id=resume.id,
        user_id=resume.user_id,
        original_filename=resume.original_filename,
        file_type=resume.file_type,
        processing_status=resume.processing_status,
        created_at=resume.created_at,
        has_analysis=False,
        latest_analysis_id=None
    )

@router.get("", response_model=List[ResumeResponse])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all resumes owned by the authenticated user."""
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).all()
    results = []
    for r in resumes:
        latest_analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.resume_id == r.id).order_by(ResumeAnalysis.id.desc()).first()
        results.append(ResumeResponse(
            id=r.id,
            user_id=r.user_id,
            original_filename=r.original_filename,
            file_type=r.file_type,
            processing_status=r.processing_status,
            created_at=r.created_at,
            has_analysis=latest_analysis is not None,
            latest_analysis_id=latest_analysis.id if latest_analysis else None
        ))
    return results

@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve a specific resume owned by the authenticated user."""
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found or access denied.")

    latest_analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.resume_id == resume.id).order_by(ResumeAnalysis.id.desc()).first()
    return ResumeResponse(
        id=resume.id,
        user_id=resume.user_id,
        original_filename=resume.original_filename,
        file_type=resume.file_type,
        processing_status=resume.processing_status,
        created_at=resume.created_at,
        has_analysis=latest_analysis is not None,
        latest_analysis_id=latest_analysis.id if latest_analysis else None
    )

@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a resume and all associated analysis records."""
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found or access denied.")

    # Remove file from disk
    file_path = settings.UPLOAD_DIR / resume.storage_key
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception:
            pass

    db.delete(resume)
    db.commit()
    return {"message": "Resume and related analysis records deleted successfully."}

@router.post("/load-demo", response_model=ResumeResponse)
def load_sample_demo_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Convenience endpoint for users to load a pre-configured sample resume
    demonstrating Python, SQLite, Data Analysis, and student project evidence.
    """
    sample_text = f"""
{current_user.full_name}
Email: {current_user.email} | Phone: (555) 789-0123 | Location: Tech City

SUMMARY
Enthusiastic developer and student seeking opportunities to apply Python, SQL, and analytical engineering to real-world software products.

EDUCATION
Bachelor of Science in Computer Science & Engineering
Metropolitan Institute of Technology, 2021 – 2025
Key Coursework: Database Management, Data Structures, Software Engineering, Machine Learning

TECHNICAL SKILLS
Languages: Python, Java, JavaScript, SQL
Web & Frameworks: HTML, CSS, React, FastAPI
Databases & Tools: SQLite, PostgreSQL, Git, GitHub, Linux, Docker

PROJECTS
Student Attendance & Academic Tracker
• Developed a full-stack student records and attendance tracking system using Python and SQLite.
• Implemented automated query indexing and record aggregation, optimizing lookup speeds by 35%.
• Engineered report export modules that process 1,000+ student attendance logs monthly.

Sales Transaction Insights Engine
• Designed exploratory data analysis scripts using Python to clean transaction datasets and identify monthly revenue trends.
• Visualized key distribution metrics and customer purchase habits.

CERTIFICATIONS
• Python for Everybody Specialization – Coursera
• Relational Database Fundamentals – Academic Certification
    """.strip()

    # Generate independent storage filename
    storage_key = f"{uuid.uuid4().hex}.pdf"

    resume = Resume(
        user_id=current_user.id,
        original_filename="Sample_Student_Resume.pdf",
        storage_key=storage_key,
        extracted_text=sample_text,
        file_type="pdf",
        processing_status="parsed"
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    return ResumeResponse(
        id=resume.id,
        user_id=resume.user_id,
        original_filename=resume.original_filename,
        file_type=resume.file_type,
        processing_status=resume.processing_status,
        created_at=resume.created_at,
        has_analysis=False,
        latest_analysis_id=None
    )

@router.post("/load-demo-photo", response_model=ResumeResponse)
def load_sample_demo_photo_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Convenience endpoint for users to test OCR on a pre-generated sample resume photo.
    """
    photo_path = settings.UPLOAD_DIR.parent / "sample_resumes" / "Alex_Rivera_Resume_Photo.png"
    if not photo_path.exists():
        raise HTTPException(status_code=404, detail="Sample resume photo file not found.")

    with open(photo_path, "rb") as f:
        file_bytes = f.read()

    parsed = resume_parser.parse_document(file_bytes, "png")

    # Generate independent storage filename
    storage_key = f"{uuid.uuid4().hex}.png"
    dest_path = settings.UPLOAD_DIR / storage_key
    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    resume = Resume(
        user_id=current_user.id,
        original_filename="Alex_Rivera_Resume_Photo.png",
        storage_key=storage_key,
        extracted_text=parsed["raw_text"],
        file_type="png",
        processing_status="parsed"
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    return ResumeResponse(
        id=resume.id,
        user_id=resume.user_id,
        original_filename=resume.original_filename,
        file_type=resume.file_type,
        processing_status=resume.processing_status,
        created_at=resume.created_at,
        has_analysis=False,
        latest_analysis_id=None
    )
