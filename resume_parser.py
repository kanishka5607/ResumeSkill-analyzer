import re
import io
import os
import platform
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
from PIL import Image
import pypdf
import docx
from app.core.config import settings

class ResumeParser:
    """
    Robust resume parser supporting PDF, DOCX, and image files.
    Identifies candidate contact details, sections, and structured text chunks.
    """
    
    SECTION_PATTERNS = {
        "Summary": [
            r"^summary\b", r"^professional\s+summary\b", r"^profile\b",
            r"^about\s+me\b", r"^objective\b", r"^career\s+objective\b"
        ],
        "Education": [
            r"^education\b", r"^academic\s+background\b", r"^academics\b",
            r"^educational\s+qualifications\b", r"^degrees\b"
        ],
        "Skills": [
            r"^technical\s+skills\b", r"^skills\b", r"^core\s+competencies\b",
            r"^skills\s+(&|and)\s+technologies\b", r"^technologies\b",
            r"^tools\s+(&|and)\s+technologies\b", r"^key\s+skills\b"
        ],
        "Projects": [
            r"^projects\b", r"^academic\s+projects\b", r"^personal\s+projects\b",
            r"^key\s+projects\b", r"^technical\s+projects\b", r"^portfolio\b"
        ],
        "Experience": [
            r"^experience\b", r"^work\s+experience\b", r"^professional\s+experience\b",
            r"^internships\b", r"^employment\s+history\b", r"^work\s+history\b"
        ],
        "Certifications": [
            r"^certifications\b", r"^certificates\b", r"^licenses\s+(&|and)\s+certifications\b",
            r"^courses\s+(&|and)\s+certifications\b", r"^training\s+(&|and)\s+certifications\b"
        ],
        "Achievements": [
            r"^achievements\b", r"^awards\b", r"^honors\b", r"^accomplishments\b"
        ],
        "Coursework": [
            r"^relevant\s+coursework\b", r"^coursework\b", r"^courses\b", r"^key\s+courses\b"
        ]
    }

    EMAIL_REGEX = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
    PHONE_REGEX = re.compile(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")

    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extract readable text from PDF bytes with page count enforcement."""
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))

            # Enforce maximum page count
            page_count = len(reader.pages)
            if page_count > settings.MAX_PDF_PAGES:
                raise ValueError(
                    f"PDF contains {page_count} pages, exceeding the maximum limit of "
                    f"{settings.MAX_PDF_PAGES} pages. Please upload a shorter document."
                )

            text_parts = []
            for page in reader.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                except Exception:
                    # Skip unreadable pages gracefully
                    continue

            full_text = "\n".join(text_parts).strip()
            if not full_text:
                raise ValueError("PDF contains no readable text. It might be scanned or image-based.")
            return full_text
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to read PDF document: {str(e)}")

    def extract_text_from_docx(self, file_bytes: bytes) -> str:
        """Extract readable text from DOCX bytes including paragraphs and tables."""
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            text_parts = []
            for para in doc.paragraphs:
                if para.text.strip():
                    text_parts.append(para.text.strip())
            for table in doc.tables:
                for row in table.rows:
                    row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_text:
                        text_parts.append(" | ".join(row_text))
            full_text = "\n".join(text_parts).strip()
            if not full_text:
                raise ValueError("DOCX document is empty.")
            return full_text
        except Exception as e:
            if isinstance(e, ValueError):
                raise e
            raise ValueError(f"Failed to read DOCX document: {str(e)}")

    def extract_text_from_image(self, file_bytes: bytes, file_ext: str = "png") -> str:
        """
        Extract readable text from a photo or scanned resume.
        Uses Windows native OCR on Windows, attempts pytesseract on Linux/Docker,
        and provides a clear error if neither is available.
        """
        temp_img_path = None
        try:
            # Validate image with PIL
            img = Image.open(io.BytesIO(file_bytes))
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            # Upscale if image is too small for accurate character recognition
            if img.width < 1000 and img.height < 1000:
                scale = max(2, int(1500 / max(img.width, img.height)))
                img = img.resize((img.width * scale, img.height * scale), Image.Resampling.LANCZOS)

            current_os = platform.system()

            if current_os == "Windows":
                return self._ocr_windows(img, file_ext)
            else:
                return self._ocr_tesseract(img)

        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to process resume photo: {str(e)}")
        finally:
            if temp_img_path and os.path.exists(temp_img_path):
                try:
                    os.remove(temp_img_path)
                except Exception:
                    pass

    def _ocr_windows(self, img: Image.Image, file_ext: str) -> str:
        """Run Windows native OCR via PowerShell runner script."""
        temp_img_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=f".{file_ext}", delete=False) as tmp:
                temp_img_path = tmp.name
                img.save(temp_img_path)

            ocr_script = Path(__file__).parent / "ocr_runner.ps1"
            if not ocr_script.exists():
                raise FileNotFoundError(f"OCR runner script not found at {ocr_script}")

            cmd = [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy", "Bypass",
                "-File", str(ocr_script),
                "-ImagePath", temp_img_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=40)

            output = result.stdout
            if "===OCR_START===" in output and "===OCR_END===" in output:
                extracted = output.split("===OCR_START===")[1].split("===OCR_END===")[0].strip()
            else:
                extracted = output.strip()

            cleaned_lines = [line.strip() for line in extracted.splitlines() if line.strip()]
            full_text = "\n".join(cleaned_lines)

            if not full_text or len(full_text) < 15:
                raise ValueError(
                    "Could not extract readable text from photo. "
                    "Please ensure the resume image is clear, upright, and legible."
                )
            return full_text
        finally:
            if temp_img_path and os.path.exists(temp_img_path):
                try:
                    os.remove(temp_img_path)
                except Exception:
                    pass

    def _ocr_tesseract(self, img: Image.Image) -> str:
        """Attempt OCR via pytesseract (Linux/Docker fallback)."""
        try:
            import pytesseract
            full_text = pytesseract.image_to_string(img).strip()
            if not full_text or len(full_text) < 15:
                raise ValueError(
                    "Could not extract readable text from photo. "
                    "Please ensure the resume image is clear, upright, and legible."
                )
            return full_text
        except ImportError:
            raise ValueError(
                "Image OCR is not available on this platform. "
                "On Linux/Docker, install 'tesseract-ocr' system package and "
                "'pytesseract' Python package. On Windows, the built-in Media OCR is used. "
                "Alternatively, convert the resume image to PDF text before uploading."
            )
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Tesseract OCR failed: {str(e)}")

    def parse_document(self, file_bytes: bytes, file_type: str) -> Dict[str, Any]:
        """Process document bytes, extract plain text and segment into structured sections."""
        file_type = file_type.lower().replace(".", "")
        if file_type == "pdf":
            raw_text = self.extract_text_from_pdf(file_bytes)
        elif file_type == "docx":
            raw_text = self.extract_text_from_docx(file_bytes)
        elif file_type in ["png", "jpg", "jpeg", "webp", "bmp"]:
            raw_text = self.extract_text_from_image(file_bytes, file_type)
        else:
            raise ValueError(f"Unsupported file format '{file_type}'. Supported formats are PDF, DOCX, and Photo (PNG, JPG, JPEG, WEBP).")

        # Extract contact information
        candidate_name, email, phone = self._extract_contact_info(raw_text)
        
        # Segment into sections
        sections = self._segment_sections(raw_text)

        return {
            "raw_text": raw_text,
            "candidate_name": candidate_name,
            "email": email,
            "phone": phone,
            "sections": sections,
            "identified_section_names": list(sections.keys())
        }

    def _extract_contact_info(self, text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        # Find email
        email_match = self.EMAIL_REGEX.search(text)
        email = email_match.group(0) if email_match else None

        # Find phone
        phone_match = self.PHONE_REGEX.search(text)
        phone = phone_match.group(0) if phone_match else None

        # Heuristic for name: first non-empty line with letters, typically not an email or address
        candidate_name = None
        for line in lines[:5]:
            clean_line = re.sub(r"[^\w\s]", "", line).strip()
            if clean_line and len(clean_line.split()) in [2, 3, 4]:
                if not ("resume" in clean_line.lower() or "curriculum" in clean_line.lower() or "@" in line):
                    candidate_name = line.strip()
                    break

        return candidate_name or "Candidate", email, phone

    def _segment_sections(self, text: str) -> Dict[str, str]:
        lines = text.split("\n")
        sections: Dict[str, List[str]] = {}
        current_section = "Header"
        sections[current_section] = []

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            matched_section = None
            # Check if line matches a known section header
            # Section headers are usually short (< 40 chars)
            if len(trimmed) < 45:
                lower_trimmed = trimmed.lower()
                for section_name, patterns in self.SECTION_PATTERNS.items():
                    for pattern in patterns:
                        if re.search(pattern, lower_trimmed):
                            matched_section = section_name
                            break
                    if matched_section:
                        break

            if matched_section:
                current_section = matched_section
                if current_section not in sections:
                    sections[current_section] = []
            else:
                sections[current_section].append(trimmed)

        # Join text for each section
        return {sec: "\n".join(content) for sec, content in sections.items() if content}

resume_parser = ResumeParser()
