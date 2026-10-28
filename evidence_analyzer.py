import re
from typing import Dict, List, Any, Optional

class EvidenceAnalyzer:
    """
    Evidence analyzer engine evaluating resume text for practical proof of skills.
    Evidence scoring is a rule-based resume-text evidence heuristic, not verified skill proof.
    Distinguishes between claims, projects, work experience, certifications,
    and calculates transparent, explainable confidence scores.
    """

    BASE_WEIGHTS = {
        "Project": 40.0,
        "Experience": 35.0,
        "Certification": 20.0,
        "Coursework": 10.0,
        "Education": 10.0,
        "SkillListOnly": 5.0,
        "Summary": 5.0,
        "Header": 5.0,
        "Achievements": 15.0,
    }

    ACTION_VERBS = [
        "developed", "built", "implemented", "engineered", "designed",
        "architected", "trained", "optimized", "deployed", "automated",
        "created", "programmed", "analyzed", "delivered", "maintained",
        "integrated", "migrated", "refactored", "configured", "evaluated",
        "spearheaded", "executed", "formulated", "established"
    ]

    METRIC_PATTERN = re.compile(
        r"(\b\d+(\.\d+)?%|\b\d+x\b|\b\d+\+?\s*(users|requests|ms|seconds|minutes|hours|days|datasets|records|rows|gb|mb|tb)\b|\bincreased\b|\breduced\b|\bdecreased\b|\bboosted\b|\bimproved\b|\bsaved\b|\breducing\b|\bincreasing\b)",
        re.IGNORECASE
    )

    def analyze_skill_evidence(self, skill_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze occurrences of a skill across resume sections.
        Produces evidence classification, confidence score (0-100),
        detailed evidence records, and human-readable explanation.
        """
        canonical_name = skill_data["canonical_name"]
        occurrences = skill_data.get("occurrences", [])
        all_sections = skill_data.get("all_sections", set())

        evidence_records = []
        highest_source_weight = 0.0
        contributing_sources = set()
        has_project_evidence = False
        has_experience_evidence = False
        has_cert_evidence = False
        has_action_verb = False
        has_metric = False
        sample_supporting_sentences = []

        for occ in occurrences:
            sec = occ["section"]
            sentence = occ["sentence"]
            clean_sentence = sentence.strip()

            # Map section name to evidence source type
            if "Project" in sec:
                ev_type = "Project"
                has_project_evidence = True
            elif "Experience" in sec or "Internship" in sec:
                ev_type = "Experience"
                has_experience_evidence = True
            elif "Certif" in sec:
                ev_type = "Certification"
                has_cert_evidence = True
            elif "Course" in sec:
                ev_type = "Coursework"
            elif "Education" in sec:
                ev_type = "Education"
            elif "Achievement" in sec:
                ev_type = "Achievements"
            elif "Skill" in sec:
                ev_type = "SkillListOnly"
            else:
                ev_type = "Summary"

            contributing_sources.add(ev_type)
            base_wt = self.BASE_WEIGHTS.get(ev_type, 5.0)

            # Check for action verb context
            sentence_lower = clean_sentence.lower()
            verb_found = any(f" {verb} " in f" {sentence_lower} " for verb in self.ACTION_VERBS)
            if verb_found:
                has_action_verb = True

            # Check for metrics / outcomes
            metric_match = bool(self.METRIC_PATTERN.search(sentence_lower))
            if metric_match:
                has_metric = True

            # Generate individual evidence record explanation
            explanation = self._generate_item_explanation(canonical_name, ev_type, clean_sentence, verb_found, metric_match)

            record = {
                "evidence_type": ev_type,
                "source_section": sec,
                "evidence_text": clean_sentence,
                "evidence_strength": base_wt,
                "explanation": explanation,
                "verification_status": "Unverified (Resume-text evidence heuristic)"
            }
            evidence_records.append(record)
            if clean_sentence not in sample_supporting_sentences:
                sample_supporting_sentences.append(clean_sentence)

        # Calculate final normalized confidence score (0-100)
        final_score, classification, explanation = self._calculate_final_score(
            canonical_name,
            contributing_sources,
            has_project_evidence,
            has_experience_evidence,
            has_cert_evidence,
            has_action_verb,
            has_metric,
            sample_supporting_sentences
        )

        return {
            "canonical_name": canonical_name,
            "category": skill_data.get("category", "General"),
            "original_text": skill_data.get("original_text", canonical_name),
            "section_name": skill_data.get("section_name", "Skills"),
            "extraction_confidence": skill_data.get("extraction_confidence", 0.95),
            "evidence_classification": classification,
            "evidence_confidence": round(final_score, 1),
            "evidence_records": evidence_records,
            "explanation": explanation,
            "supporting_sentences": sample_supporting_sentences[:3]
        }

    def _generate_item_explanation(self, skill: str, ev_type: str, sentence: str, has_verb: bool, has_metric: bool) -> str:
        if ev_type == "Project":
            detail = "explicitly applied within a practical project"
            if has_verb and has_metric:
                detail += " with demonstrated implementation actions and quantifiable outcomes"
            elif has_verb:
                detail += " with active implementation verbs"
            return f"{skill} is {detail} in: \"{sentence[:120]}...\""
        elif ev_type == "Experience":
            return f"{skill} is documented in professional/internship experience: \"{sentence[:120]}...\""
        elif ev_type == "Certification":
            return f"{skill} is supported by formal training or credential: \"{sentence[:120]}...\""
        elif ev_type in ["Coursework", "Education"]:
            return f"{skill} was studied as part of relevant academic curriculum or coursework."
        else:
            return f"{skill} is listed in resume skills without attached project or work context."

    def _calculate_final_score(
        self,
        skill: str,
        sources: set,
        has_proj: bool,
        has_exp: bool,
        has_cert: bool,
        has_verb: bool,
        has_metric: bool,
        sentences: List[str]
    ) -> tuple[float, str, str]:
        """
        Calculate score on 0-100 scale using composite weighting and context boosts.
        Ensures explainable classification boundaries.
        """
        score = 0.0

        # Primary source weights
        if has_proj:
            score += 40.0
        if has_exp:
            score += 35.0
        if has_cert:
            score += 20.0
        if "Coursework" in sources or "Education" in sources:
            score += 10.0
        if "SkillListOnly" in sources and not (has_proj or has_exp or has_cert):
            score += 10.0

        # Context modifiers
        if has_verb and (has_proj or has_exp):
            score += 15.0
        if has_metric and (has_proj or has_exp):
            score += 15.0
        if len(sources) >= 2:
            score += 10.0  # Multi-source corroboration boost

        # Cap score at 95.0 for resume-based evidence (reserve 100 for verified credentials)
        final_score = min(score, 95.0)

        # Classification determination
        if final_score >= 55.0 and (has_proj or has_exp or has_cert):
            classification = "Evidence-Backed Skill"
            advice = (
                f"The resume includes practical evidence for {skill}. "
                f"To strengthen it further, describe specific technical challenges, architecture decisions, or measurable impact."
            )
        elif final_score >= 25.0:
            classification = "Weakly Supported Skill"
            advice = (
                f"{skill} has limited or introductory context (e.g. academic coursework or a brief mention). "
                f"Add a concrete project detailing your implementation to turn this into an evidence-backed skill."
            )
        else:
            classification = "Claimed Skill"
            advice = (
                f"{skill} appears only as a list item without practical project or work description. "
                f"Build a practical project or showcase repository evidence to validate this claim."
            )

        explanation = f"{classification} ({int(final_score)}/100). {advice}"
        return final_score, classification, explanation

evidence_analyzer = EvidenceAnalyzer()
