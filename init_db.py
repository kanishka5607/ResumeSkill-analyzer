import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.models.all_models import (
    User, Resume, ResumeAnalysis, Skill, SkillAlias, ResumeSkill,
    SkillEvidence, JobRole, JobRoleSkill, JobDescription, GapReport,
    GapItem, LearningResource, LearningProgress, Project, AuditEvent
)
from app.core.security import hash_password
from app.core.config import settings
from app.services.skill_extractor import skill_extractor
from app.services.evidence_analyzer import evidence_analyzer
from app.services.matching_engine import matching_engine
from app.services.readiness_scorer import readiness_scorer
from app.services.proof_scorer import proof_scorer
from app.services.gap_analyzer import gap_analyzer

def init_database():
    """Create all tables and seed default dataset."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()

def seed_data(db: Session):
    # 1. Seed Skills and Aliases from Taxonomy
    if db.query(Skill).count() == 0:
        print("Seeding skills taxonomy and aliases...")
        taxonomy = skill_extractor.taxonomy
        skill_obj_map = {}

        for canonical_name, data in taxonomy.items():
            category = data.get("category", "General")
            skill_obj = Skill(
                canonical_name=canonical_name,
                category=category,
                description=f"Industry standard {category.lower()} technology and skill: {canonical_name}"
            )
            db.add(skill_obj)
            db.flush()
            skill_obj_map[canonical_name] = skill_obj

            # Add aliases
            aliases = data.get("aliases", [])
            for alias in aliases:
                alias_obj = SkillAlias(
                    skill_id=skill_obj.id,
                    alias=alias,
                    normalized_alias=alias.lower().strip()
                )
                db.add(alias_obj)

        db.commit()

        # 2. Seed Job Roles & Requirements
        print("Seeding predefined job roles and requirements...")
        roles_data = [
            {
                "title": "Junior Data Analyst",
                "description": "Analyzes raw data, designs dashboards, builds SQL queries, and generates business intelligence insights.",
                "required": ["SQL", "Python", "Data Analysis", "Data Visualization", "Data Cleaning"],
                "preferred": ["Statistical Modeling", "Communication", "SQLite", "Pandas"]
            },
            {
                "title": "Python Backend Developer",
                "description": "Develops robust server-side APIs, database architectures, and business logic using Python frameworks.",
                "required": ["Python", "FastAPI", "SQL", "PostgreSQL", "REST API"],
                "preferred": ["Docker", "Git", "Redis", "Linux"]
            },
            {
                "title": "Full-Stack Developer",
                "description": "Builds end-to-end responsive web applications from database models to modern interactive user interfaces.",
                "required": ["JavaScript", "React", "Node.js", "HTML", "CSS", "SQL", "REST API"],
                "preferred": ["TypeScript", "Git", "Docker", "Tailwind CSS"]
            },
            {
                "title": "Machine Learning Engineer",
                "description": "Designs, trains, evaluates, and deploys predictive machine learning and deep learning models in production.",
                "required": ["Python", "Machine Learning", "Scikit-Learn", "Deep Learning", "PyTorch", "NumPy", "Pandas"],
                "preferred": ["Docker", "Model Evaluation", "Git", "Linux"]
            },
            {
                "title": "Data Scientist",
                "description": "Combines domain expertise, advanced statistical analysis, and machine learning to uncover actionable insights.",
                "required": ["Python", "SQL", "Data Analysis", "Machine Learning", "Statistical Modeling", "Pandas"],
                "preferred": ["Matplotlib", "Seaborn", "Communication", "Deep Learning"]
            },
            {
                "title": "Frontend Developer",
                "description": "Creates accessible, high-performance web user experiences with modern JavaScript/TypeScript frameworks.",
                "required": ["JavaScript", "TypeScript", "React", "HTML", "CSS", "Tailwind CSS"],
                "preferred": ["Redux", "REST API", "Git", "Next.js"]
            },
            {
                "title": "Java Developer",
                "description": "Builds enterprise-grade backend services and microservices using Java and modern frameworks.",
                "required": ["Java", "Spring Boot", "SQL", "REST API", "Git"],
                "preferred": ["Docker", "Linux", "MySQL", "PostgreSQL"]
            },
            {
                "title": "AI Engineer",
                "description": "Engineers generative AI, LLM applications, retrieval-augmented systems, and neural network pipelines.",
                "required": ["Python", "Large Language Models", "Natural Language Processing", "PyTorch", "LangChain"],
                "preferred": ["REST API", "Docker", "HuggingFace", "BERT"]
            },
            {
                "title": "DevOps Engineer",
                "description": "Automates deployment pipelines, cloud infrastructure provisioning, and container orchestration.",
                "required": ["Linux", "Docker", "Kubernetes", "CI/CD", "Git", "AWS"],
                "preferred": ["Python", "PostgreSQL", "Jira"]
            },
            {
                "title": "Software Developer",
                "description": "General software engineering role focusing on algorithmic problem solving, clean architecture, and modular code.",
                "required": ["Python", "SQL", "Git", "Problem Solving", "REST API"],
                "preferred": ["Docker", "JavaScript", "Linux", "Teamwork"]
            }
        ]

        for r in roles_data:
            role = JobRole(
                title=r["title"],
                description=r["description"],
                is_custom=False
            )
            db.add(role)
            db.flush()

            for s_name in r["required"]:
                skill_obj = db.query(Skill).filter(Skill.canonical_name == s_name).first()
                if skill_obj:
                    jrs = JobRoleSkill(
                        job_role_id=role.id,
                        skill_id=skill_obj.id,
                        requirement_type="Required",
                        importance_weight=2.0,
                        minimum_proficiency="Intermediate"
                    )
                    db.add(jrs)

            for s_name in r["preferred"]:
                skill_obj = db.query(Skill).filter(Skill.canonical_name == s_name).first()
                if skill_obj:
                    jrs = JobRoleSkill(
                        job_role_id=role.id,
                        skill_id=skill_obj.id,
                        requirement_type="Preferred",
                        importance_weight=1.0,
                        minimum_proficiency="Beginner"
                    )
                    db.add(jrs)

        db.commit()

        # 3. Seed Curated Learning Resources
        print("Seeding curated learning resources...")
        curated_resources = [
            ("SQL", "SQL for Data Science", "Coursera (UC Davis)", "https://www.coursera.org/learn/sql-for-data-science", "Course", "Beginner", "15 hours", "Learn SELECT, joins, aggregations, and subqueries with real datasets."),
            ("SQL", "W3Schools SQL Tutorial", "W3Schools", "https://www.w3schools.com/sql/", "Tutorial", "Beginner", "8 hours", "Interactive in-browser SQL queries and reference guide."),
            ("Python", "Python for Everybody Specialization", "Coursera (University of Michigan)", "https://www.coursera.org/specializations/python", "Course", "Beginner", "20 hours", "Comprehensive introduction to Python programming, data structures, and web scraping."),
            ("Python", "The Python Tutorial (Official Docs)", "Python Software Foundation", "https://docs.python.org/3/tutorial/", "Documentation", "Beginner", "10 hours", "Official guide to Python syntax, standard library, and modules."),
            ("Data Analysis", "Google Data Analytics Professional Certificate", "Google / Coursera", "https://www.coursera.org/professional-certificates/google-data-analytics", "Course", "Beginner", "30 hours", "Practical data analytics workflow from data cleaning to presentation."),
            ("Data Visualization", "Data Visualization with Python", "Kaggle", "https://www.kaggle.com/learn/data-visualization", "Interactive Lab", "Intermediate", "6 hours", "Hands-on plotting with Seaborn and Matplotlib."),
            ("Data Cleaning", "Data Cleaning Tutorial", "Kaggle", "https://www.kaggle.com/learn/data-cleaning", "Interactive Lab", "Intermediate", "5 hours", "Handling missing values, scaling, normalization, and parsing dates."),
            ("React", "React Documentation & Interactive Quickstart", "React Team (Meta)", "https://react.dev/learn", "Documentation", "Beginner", "12 hours", "Modern React with Hooks, state management, and component architecture."),
            ("Node.js", "Node.js Full Course for Beginners", "freeCodeCamp", "https://www.freecodecamp.org/news/learn-node-js/", "Tutorial", "Intermediate", "10 hours", "Building servers, event loops, and asynchronous operations."),
            ("FastAPI", "FastAPI Official Tutorial", "Tiangolo / FastAPI", "https://fastapi.tiangolo.com/tutorial/", "Documentation", "Intermediate", "8 hours", "High-performance Python APIs with automatic OpenAPI docs and Pydantic."),
            ("Machine Learning", "Intro to Machine Learning", "Kaggle", "https://www.kaggle.com/learn/intro-to-machine-learning", "Interactive Lab", "Beginner", "8 hours", "Train decision trees, random forests, and measure validation metrics."),
            ("Deep Learning", "Deep Learning Specialization", "DeepLearning.AI", "https://www.coursera.org/specializations/deep-learning", "Course", "Intermediate", "40 hours", "Neural networks, CNNs, RNNs, and hyperparameter tuning."),
            ("Docker", "Docker Curriculum for Beginners", "Docker Curriculum", "https://docker-curriculum.com/", "Tutorial", "Beginner", "6 hours", "Containerizing web applications, writing Dockerfiles, and docker-compose."),
            ("Git", "Git Handbook", "GitHub", "https://guides.github.com/introduction/git-handbook/", "Guide", "Beginner", "3 hours", "Branching, merging, commit discipline, and pull requests."),
            ("PostgreSQL", "PostgreSQL Tutorial for Beginners", "PostgreSQL Tutorial", "https://www.postgresqltutorial.com/", "Tutorial", "Intermediate", "10 hours", "Practical database design, indexing, and complex queries."),
            ("Statistical Modeling", "Intro to Statistics", "Khan Academy", "https://www.khanacademy.org/math/statistics-probability", "Course", "Beginner", "15 hours", "Probability distributions, hypothesis testing, and regression analysis."),
            ("Communication", "Effective Communication for Engineers", "Coursera", "https://www.coursera.org/learn/effective-communication-engineers", "Course", "Beginner", "6 hours", "Technical presentations, stakeholder alignment, and documentation clarity.")
        ]

        for s_name, title, prov, url, rtype, diff, eff, desc in curated_resources:
            sk = db.query(Skill).filter(Skill.canonical_name == s_name).first()
            if sk:
                lr = LearningResource(
                    skill_id=sk.id,
                    title=title,
                    provider=prov,
                    resource_url=url,
                    resource_type=rtype,
                    difficulty_level=diff,
                    estimated_effort=eff,
                    description=desc
                )
                db.add(lr)

        db.commit()

    # 4. Seed Admin user — only if SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are configured
    if settings.SEED_ADMIN_EMAIL and settings.SEED_ADMIN_PASSWORD:
        admin_user = db.query(User).filter(User.email == settings.SEED_ADMIN_EMAIL).first()
        if not admin_user:
            print(f"Seeding admin user: {settings.SEED_ADMIN_EMAIL}")
            admin_user = User(
                full_name="Kanishka (Platform Administrator)",
                email=settings.SEED_ADMIN_EMAIL,
                password_hash=hash_password(settings.SEED_ADMIN_PASSWORD),
                role="admin"
            )
            db.add(admin_user)
            db.commit()
    else:
        print("Skipping admin seed — SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not configured.")

    # 5. Seed Demo Candidate — only in development or when SEED_DEMO_DATA is true
    if not settings.SEED_DEMO_DATA:
        print("Skipping demo candidate seed (SEED_DEMO_DATA is false).")
        return

    candidate_user = db.query(User).filter(User.email == "candidate@resumeskill.com").first()
    if not candidate_user:
        print("Seeding demo candidate user: candidate@resumeskill.com")
        candidate_user = User(
            full_name="Demo Candidate",
            email="candidate@resumeskill.com",
            password_hash=hash_password("Candidate@123456"),
            role="candidate"
        )
        db.add(candidate_user)
        db.commit()

        # 5. Seed Pre-loaded Sample Resume & Analysis for Demo Candidate
        print("Seeding pre-loaded demo resume & analysis report...")
        sample_resume_text = """
Demo Candidate
Email: candidate@resumeskill.com | Phone: (555) 234-5678 | Location: San Francisco, CA

PROFESSIONAL SUMMARY
Aspiring Junior Data Analyst with foundational knowledge in Python, SQL, and database management. Eager to solve real-world problems through data-driven analysis and clear visualizations.

EDUCATION
Bachelor of Technology in Artificial Intelligence and Data Science
State University, 2021 – 2025
Relevant Coursework: Database Management Systems, Data Structures, Applied Statistics, Software Engineering

TECHNICAL SKILLS
Programming: Python, Java, C++
Databases: SQL, SQLite, PostgreSQL
Data & Web: HTML, CSS, Data Analysis, Machine Learning
Tools: Git, GitHub, VS Code

PROJECTS
Student Attendance Management System
• Developed a full student attendance tracking application using Python and SQLite.
• Implemented record creation, automated data retrieval, and SQL query optimizations reducing search times by 30%.
• Formatted attendance analytics and generated monthly summary reports for 500+ student records.

Sales Data Exploration
• Built exploratory data analysis scripts using Python to clean transaction datasets and identify monthly revenue trends.
• Visualized key distribution metrics and customer purchase habits.

CERTIFICATIONS
• Introductory Python Programming Certificate – Coursera
• Relational Database Fundamentals Coursework – University Credential
        """.strip()

        demo_resume = Resume(
            user_id=candidate_user.id,
            original_filename="Demo_Candidate_Resume.pdf",
            storage_key="sample_demo_resume.pdf",
            extracted_text=sample_resume_text,
            file_type="pdf",
            processing_status="parsed"
        )
        db.add(demo_resume)
        db.commit()

        # Parse sections and run extraction
        sections = {
            "Summary": "Aspiring Junior Data Analyst with foundational knowledge in Python, SQL, and database management. Eager to solve real-world problems through data-driven analysis and clear visualizations.",
            "Education": "Bachelor of Technology in Artificial Intelligence and Data Science\nState University, 2021 – 2025\nRelevant Coursework: Database Management Systems, Data Structures, Applied Statistics, Software Engineering",
            "Skills": "Programming: Python, Java, C++\nDatabases: SQL, SQLite, PostgreSQL\nData & Web: HTML, CSS, Data Analysis, Machine Learning\nTools: Git, GitHub, VS Code",
            "Projects": "Student Attendance Management System\n• Developed a full student attendance tracking application using Python and SQLite.\n• Implemented record creation, automated data retrieval, and SQL query optimizations reducing search times by 30%.\n• Formatted attendance analytics and generated monthly summary reports for 500+ student records.\nSales Data Exploration\n• Built exploratory data analysis scripts using Python to clean transaction datasets and identify monthly revenue trends.\n• Visualized key distribution metrics and customer purchase habits.",
            "Certifications": "Introductory Python Programming Certificate – Coursera\nRelational Database Fundamentals Coursework – University Credential"
        }

        extracted_skills = skill_extractor.extract_from_sections(sections)
        analyzed_skills = [evidence_analyzer.analyze_skill_evidence(s) for s in extracted_skills]

        # Calculate proof score
        proof_res = proof_scorer.calculate_skill_proof_score(analyzed_skills)

        profile_json = {
            "candidate_name": "Demo Candidate",
            "email": "candidate@resumeskill.com",
            "phone": "(555) 234-5678",
            "summary": sections["Summary"],
            "sections": sections,
            "total_skills_found": len(analyzed_skills)
        }

        analysis = ResumeAnalysis(
            resume_id=demo_resume.id,
            user_id=candidate_user.id,
            analysis_version=1,
            extracted_profile=json.dumps(profile_json),
            overall_status="completed"
        )
        db.add(analysis)
        db.commit()

        # Add resume skills & evidence
        for askill in analyzed_skills:
            sk_obj = db.query(Skill).filter(Skill.canonical_name == askill["canonical_name"]).first()
            if not sk_obj:
                sk_obj = Skill(canonical_name=askill["canonical_name"], category=askill["category"])
                db.add(sk_obj)
                db.commit()

            rskill = ResumeSkill(
                analysis_id=analysis.id,
                skill_id=sk_obj.id,
                original_text=askill["original_text"],
                section_name=askill["section_name"],
                extraction_confidence=askill["extraction_confidence"],
                evidence_classification=askill["evidence_classification"],
                evidence_confidence=askill["evidence_confidence"]
            )
            db.add(rskill)
            db.flush()

            for ev in askill["evidence_records"]:
                evidence_row = SkillEvidence(
                    resume_skill_id=rskill.id,
                    evidence_type=ev["evidence_type"],
                    source_section=ev["source_section"],
                    evidence_text=ev["evidence_text"],
                    evidence_strength=ev["evidence_strength"],
                    explanation=ev["explanation"],
                    verification_status=ev["verification_status"]
                )
                db.add(evidence_row)

        db.commit()

        # Run match against Junior Data Analyst role
        target_role = db.query(JobRole).filter(JobRole.title == "Junior Data Analyst").first()
        if target_role:
            role_reqs = []
            for jrs in target_role.skills_required:
                role_reqs.append({
                    "skill_id": jrs.skill_id,
                    "canonical_name": jrs.skill.canonical_name,
                    "category": jrs.skill.category,
                    "requirement_type": jrs.requirement_type,
                    "importance_weight": jrs.importance_weight
                })

            match_res = matching_engine.match_candidate_against_requirements(analyzed_skills, role_reqs)
            readiness_data = readiness_scorer.calculate_readiness_score(match_res)
            gaps = gap_analyzer.analyze_gaps(match_res)

            report = GapReport(
                analysis_id=analysis.id,
                job_role_id=target_role.id,
                readiness_score=readiness_data["overall_score"],
                skill_proof_score=proof_res["skill_proof_score"],
                scoring_version="v1.0"
            )
            db.add(report)
            db.commit()

            for g in gaps:
                sk_obj = db.query(Skill).filter(Skill.canonical_name == g["canonical_name"]).first()
                gitem = GapItem(
                    gap_report_id=report.id,
                    skill_id=sk_obj.id if sk_obj else 1,
                    requirement_type=g["requirement_type"],
                    candidate_status=g["candidate_status"],
                    gap_priority=g["gap_priority"],
                    evidence_confidence=g["evidence_confidence"],
                    explanation=g["explanation"],
                    recommended_action=g["recommended_action"]
                )
                db.add(gitem)

            db.commit()
            print("Demo candidate pre-loaded analysis and gap report ready!")

if __name__ == "__main__":
    init_database()
