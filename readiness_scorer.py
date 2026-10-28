from typing import List, Dict, Any

class ReadinessScorer:
    """
    Transparent, explainable Job Readiness Scorer.
    Calculates weighted readiness based on verified resume evidence vs role requirements.
    """

    CONTRIBUTIONS = {
        "Strong Match": 1.00,
        "Partial Match": 0.70,
        "Claimed Match": 0.30,
        "Missing Skill": 0.00,
        "Needs Review": 0.20,
    }

    def calculate_readiness_score(self, match_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate explainable job readiness score and transparent factor breakdown.
        """
        if not match_results:
            return {
                "overall_score": 0.0,
                "scoring_formula": "Job Readiness Score = (Sum of weighted requirement contributions / Sum of requirement weights) * 100",
                "total_requirements": 0,
                "strong_matches_count": 0,
                "partial_matches_count": 0,
                "claimed_matches_count": 0,
                "missing_count": 0,
                "positive_factors": [],
                "negative_factors": ["No requirements specified or matched."],
                "limitations_disclaimer": (
                    "This score is an evidence-based matching heuristic based strictly on readable resume content. "
                    "It is not an objective assessment of human ability or a hiring guarantee."
                )
            }

        total_weighted_points = 0.0
        total_weight = 0.0

        strong_count = 0
        partial_count = 0
        claimed_count = 0
        missing_count = 0

        positive_factors = []
        negative_factors = []

        for item in match_results:
            status = item.get("candidate_status", "Missing Skill")
            req_type = item.get("requirement_type", "Required")
            weight = float(item.get("importance_weight", 2.0 if req_type == "Required" else 1.0))
            name = item.get("canonical_name", "Skill")

            contribution = self.CONTRIBUTIONS.get(status, 0.0)
            weighted_contrib = contribution * weight

            total_weighted_points += weighted_contrib
            total_weight += weight

            if status == "Strong Match":
                strong_count += 1
                positive_factors.append(f"Demonstrated project/practical evidence for {name} ({req_type}).")
            elif status == "Partial Match":
                partial_count += 1
                positive_factors.append(f"Related or introductory evidence identified for {name} ({req_type}).")
            elif status == "Claimed Match":
                claimed_count += 1
                negative_factors.append(f"{name} is listed in skills but lacks concrete project demonstration.")
            else:
                missing_count += 1
                negative_factors.append(f"Missing {req_type} skill: {name} (no evidence found).")

        overall_score = (total_weighted_points / total_weight) * 100.0 if total_weight > 0 else 0.0
        overall_score = round(max(0.0, min(100.0, overall_score)), 1)

        formula_desc = (
            f"Readiness Score = (Weighted Points: {round(total_weighted_points, 1)} / Total Weights: {round(total_weight, 1)}) * 100 = {overall_score}%"
        )

        return {
            "overall_score": overall_score,
            "scoring_formula": formula_desc,
            "total_requirements": len(match_results),
            "strong_matches_count": strong_count,
            "partial_matches_count": partial_count,
            "claimed_matches_count": claimed_count,
            "missing_count": missing_count,
            "positive_factors": positive_factors[:5],
            "negative_factors": negative_factors[:5],
            "limitations_disclaimer": (
                "Notice: This score is a heuristic evidence indicator reflecting resume documentation strength. "
                "It does not certify verified candidate proficiency or guarantee interview outcomes."
            )
        }

readiness_scorer = ReadinessScorer()
