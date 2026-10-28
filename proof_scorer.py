from typing import List, Dict, Any

class ProofScorer:
    """
    Skill Proof Score Calculator.
    Measures the proportion of a candidate's claimed skills backed by verifiable resume evidence.
    """

    def calculate_skill_proof_score(self, extracted_skills: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Computes the Skill Proof Score (0-100) across all claimed skills.
        """
        if not extracted_skills:
            return {
                "skill_proof_score": 0.0,
                "total_claimed_skills": 0,
                "backed_skills_count": 0,
                "moderate_skills_count": 0,
                "weak_skills_count": 0,
                "unsupported_skills_count": 0,
                "explanation": "No skills extracted from resume.",
                "formula": "Skill Proof Score = 0 (No skills claimed)"
            }

        total_skills = len(extracted_skills)
        total_contribution = 0.0

        backed_count = 0
        moderate_count = 0
        weak_count = 0
        unsupported_count = 0

        for skill in extracted_skills:
            ev_score = float(skill.get("evidence_confidence", 0.0))
            classification = skill.get("evidence_classification", "Claimed Skill")

            if classification == "Evidence-Backed Skill" or ev_score >= 50.0:
                total_contribution += 1.0
                backed_count += 1
            elif classification == "Weakly Supported Skill" or ev_score >= 25.0:
                total_contribution += 0.7
                moderate_count += 1
            elif ev_score > 0.0:
                total_contribution += 0.3
                weak_count += 1
            else:
                total_contribution += 0.0
                unsupported_count += 1

        proof_score = (total_contribution / total_skills) * 100.0
        proof_score = round(max(0.0, min(100.0, proof_score)), 1)

        formula_str = (
            f"Skill Proof Score = (({backed_count} × 1.0 + {moderate_count} × 0.7 + {weak_count} × 0.3 + {unsupported_count} × 0.0) / {total_skills}) × 100 = {proof_score}%"
        )

        if proof_score >= 70.0:
            advice = "High evidence density. Most claimed skills have direct project or experience backing."
        elif proof_score >= 40.0:
            advice = "Moderate evidence density. Several claimed skills need supporting project descriptions or metrics."
        else:
            advice = "Low evidence density. Most skills appear only in keyword lists without documented experience."

        return {
            "skill_proof_score": proof_score,
            "total_claimed_skills": total_skills,
            "backed_skills_count": backed_count,
            "moderate_skills_count": moderate_count,
            "weak_skills_count": weak_count,
            "unsupported_skills_count": unsupported_count,
            "explanation": f"Skill Proof Score: {proof_score}/100. {advice}",
            "formula": formula_str
        }

proof_scorer = ProofScorer()
