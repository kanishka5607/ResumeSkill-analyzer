import re
from typing import Dict, List, Any, Optional
from app.services.skill_extractor import skill_extractor

class MatchingEngine:
    """
    Semantic and rule-based matching engine comparing candidate resume evidence
    against job role requirements or parsed job descriptions.
    """

    # Related skill affinity mappings for explainable partial matches
    RELATED_SKILL_MAP = {
        "SQL": ["SQLite", "PostgreSQL", "MySQL", "Oracle Database"],
        "SQLite": ["SQL", "PostgreSQL", "MySQL"],
        "PostgreSQL": ["SQL", "MySQL", "SQLite"],
        "Data Visualization": ["Matplotlib", "Seaborn", "Tableau", "Power BI"],
        "Data Analysis": ["Pandas", "NumPy", "Data Cleaning", "Data Visualization"],
        "Machine Learning": ["Scikit-Learn", "Deep Learning", "TensorFlow", "PyTorch"],
        "Deep Learning": ["Machine Learning", "PyTorch", "TensorFlow", "Keras"],
        "Natural Language Processing": ["Machine Learning", "BERT", "Large Language Models", "HuggingFace"],
        "REST API": ["FastAPI", "Express", "Flask", "Django", "Node.js"],
        "Web Development": ["HTML", "CSS", "JavaScript", "React"],
        "Python": ["FastAPI", "Django", "Flask", "Pandas", "NumPy"]
    }

    # Section-level header patterns (used for line-based section detection)
    REQUIRED_PATTERNS = [
        r"\brequired\b", r"\bmust\s+have\b", r"\bminimum\s+qualifications\b",
        r"\brequirements\b", r"\bessential\b", r"\bcore\s+skills\b"
    ]
    PREFERRED_PATTERNS = [
        r"\bpreferred\b", r"\bnice\s+to\s+have\b", r"\bbonus\b",
        r"\bdesired\b", r"\badditional\b", r"\bplus\b", r"\bgood\s+to\s+have\b"
    ]

    # Sentence-level linguistic modal patterns for classifying unheaded lines
    REQUIRED_MODAL_PATTERNS = [
        r"\bmust\b", r"\brequired\b", r"\bessential\b", r"\bmandatory\b",
        r"\bnecessary\b", r"\bminimum\b", r"\bresponsible\s+for\b",
        r"\byou\s+will\b", r"\byou\s+should\b", r"\bstrong\s+knowledge\b",
        r"\bproficient\s+in\b", r"\bexperience\s+with\b", r"\bexpertise\s+in\b",
        r"\bsolid\s+understanding\b", r"\bproven\b", r"\bdemonstrated\b"
    ]
    PREFERRED_MODAL_PATTERNS = [
        r"\bpreferred\b", r"\bnice\s+to\s+have\b", r"\bbonus\b",
        r"\bdesired\b", r"\bplus\b", r"\bgood\s+to\s+have\b",
        r"\bfamiliarity\s+with\b", r"\bexposure\s+to\b", r"\bwilling\s+to\s+learn\b",
        r"\badvantageous\b", r"\bideally\b", r"\boptional\b"
    ]

    def parse_job_description(self, text: str) -> Dict[str, Any]:
        """
        Extract required and preferred skills from raw job description text.
        """
        lines = text.split("\n")
        required_text_chunks = []
        preferred_text_chunks = []
        general_chunks = []

        current_mode = "general"

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            lower_line = line_str.lower()
            is_header = len(line_str.split()) <= 4 or line_str.endswith(":")

            if is_header and any(re.search(pat, lower_line) for pat in self.REQUIRED_PATTERNS):
                current_mode = "required"
                continue
            elif is_header and any(re.search(pat, lower_line) for pat in self.PREFERRED_PATTERNS):
                current_mode = "preferred"
                continue

            # Check sentence-level modal patterns for non-header lines
            if any(re.search(pat, lower_line) for pat in self.REQUIRED_PATTERNS + self.REQUIRED_MODAL_PATTERNS):
                required_text_chunks.append(line_str)
            elif any(re.search(pat, lower_line) for pat in self.PREFERRED_PATTERNS + self.PREFERRED_MODAL_PATTERNS):
                preferred_text_chunks.append(line_str)
            elif current_mode == "required":
                required_text_chunks.append(line_str)
            elif current_mode == "preferred":
                preferred_text_chunks.append(line_str)
            else:
                general_chunks.append(line_str)

        # If no explicit header sections found, classify each line individually
        # using sentence-level linguistic modal patterns instead of naively splitting in half.
        if not required_text_chunks and not preferred_text_chunks:
            for chunk in general_chunks:
                lower_chunk = chunk.lower()
                if any(re.search(pat, lower_chunk) for pat in self.PREFERRED_MODAL_PATTERNS):
                    preferred_text_chunks.append(chunk)
                elif any(re.search(pat, lower_chunk) for pat in self.REQUIRED_MODAL_PATTERNS):
                    required_text_chunks.append(chunk)
                else:
                    # Default unclassified lines to required (conservative approach)
                    required_text_chunks.append(chunk)
            # If still empty after classification, treat all as required
            if not required_text_chunks:
                required_text_chunks = general_chunks

        req_text = " ".join(required_text_chunks)
        pref_text = " ".join(preferred_text_chunks)

        req_skills_raw = skill_extractor.extract_from_text(req_text)
        pref_skills_raw = skill_extractor.extract_from_text(pref_text)

        required_skills = []
        preferred_skills = []
        seen = set()

        for s in req_skills_raw:
            cname = s["canonical_name"]
            if cname not in seen:
                seen.add(cname)
                required_skills.append({
                    "canonical_name": cname,
                    "category": s["category"],
                    "requirement_type": "Required",
                    "importance_weight": 2.0
                })

        for s in pref_skills_raw:
            cname = s["canonical_name"]
            if cname not in seen:
                seen.add(cname)
                preferred_skills.append({
                    "canonical_name": cname,
                    "category": s["category"],
                    "requirement_type": "Preferred",
                    "importance_weight": 1.0
                })

        return {
            "required_skills": required_skills,
            "preferred_skills": preferred_skills,
            "total_requirements": len(required_skills) + len(preferred_skills)
        }

    def match_candidate_against_requirements(
        self,
        candidate_skills: List[Dict[str, Any]],
        requirements: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Compare candidate skills & evidence against requirements.
        Classifies into:
        - Strong Match (Evidence-backed, confidence >= 50)
        - Partial Match (Weakly supported OR supported by closely related skill)
        - Claimed Match (Skill listed without project/experience context)
        - Missing Skill (Not present in resume)
        - Needs Review
        """
        # Index candidate skills by canonical name (lowercase)
        cand_map = {s["canonical_name"].lower(): s for s in candidate_skills}

        match_results = []

        for req in requirements:
            req_name = req["canonical_name"]
            req_lower = req_name.lower()
            req_type = req.get("requirement_type", "Required")
            importance = req.get("importance_weight", 2.0 if req_type == "Required" else 1.0)
            skill_id = req.get("skill_id", 0)

            if req_lower in cand_map:
                cand_skill = cand_map[req_lower]
                ev_class = cand_skill.get("evidence_classification", "Claimed Skill")
                ev_score = cand_skill.get("evidence_confidence", 0.0)
                excerpts = cand_skill.get("supporting_sentences", [])

                if ev_class == "Evidence-Backed Skill" or ev_score >= 50.0:
                    status = "Strong Match"
                    explanation = (
                        f"Direct match with evidence-backed proof ({int(ev_score)}/100). "
                        f"Demonstrated in resume practical experience or projects."
                    )
                    action = "Highlight your specific technical contributions and metrics during interviews."
                elif ev_class == "Weakly Supported Skill" or ev_score >= 25.0:
                    status = "Partial Match"
                    explanation = (
                        f"Direct mention with moderate/introductory context ({int(ev_score)}/100). "
                        f"Lacks deep project outcomes or measurable results."
                    )
                    action = "Expand your resume bullet points with concrete metrics and implementation details."
                else:
                    status = "Claimed Match"
                    explanation = (
                        f"Claimed skill ({int(ev_score)}/100). "
                        f"Skill is listed in your resume but lacks supporting project or work experience text."
                    )
                    action = "Build a portfolio project utilizing this skill and document it on your resume."
                
                match_results.append({
                    "skill_id": skill_id,
                    "canonical_name": req_name,
                    "category": req.get("category", cand_skill.get("category", "General")),
                    "requirement_type": req_type,
                    "importance_weight": importance,
                    "candidate_status": status,
                    "evidence_confidence": ev_score,
                    "explanation": explanation,
                    "recommended_action": action,
                    "supporting_excerpts": excerpts
                })
            else:
                # Check for related skill match (e.g., job wants SQL, candidate has SQLite with evidence)
                related_candidates = self.RELATED_SKILL_MAP.get(req_name, [])
                found_related = None
                for rel in related_candidates:
                    if rel.lower() in cand_map:
                        found_related = cand_map[rel.lower()]
                        break

                if found_related and found_related.get("evidence_confidence", 0) >= 40.0:
                    rel_name = found_related["canonical_name"]
                    rel_score = found_related.get("evidence_confidence", 0)
                    status = "Partial Match"
                    explanation = (
                        f"Related skill match: Job requires {req_name}, and resume demonstrates practical experience with {rel_name} ({int(rel_score)}/100)."
                    )
                    action = f"Explicitly bridge your experience in {rel_name} to {req_name} by practicing standard {req_name} syntax and workflows."
                    match_results.append({
                        "skill_id": skill_id,
                        "canonical_name": req_name,
                        "category": req.get("category", "General"),
                        "requirement_type": req_type,
                        "importance_weight": importance,
                        "candidate_status": status,
                        "evidence_confidence": rel_score * 0.7,
                        "explanation": explanation,
                        "recommended_action": action,
                        "supporting_excerpts": found_related.get("supporting_sentences", [])
                    })
                else:
                    # Missing skill
                    status = "Missing Skill"
                    explanation = f"Required skill {req_name} was not identified anywhere in the uploaded resume."
                    action = f"Complete guided learning on {req_name} fundamentals and complete a practical project to add to your resume."
                    match_results.append({
                        "skill_id": skill_id,
                        "canonical_name": req_name,
                        "category": req.get("category", "General"),
                        "requirement_type": req_type,
                        "importance_weight": importance,
                        "candidate_status": status,
                        "evidence_confidence": 0.0,
                        "explanation": explanation,
                        "recommended_action": action,
                        "supporting_excerpts": []
                    })

        return match_results

matching_engine = MatchingEngine()
