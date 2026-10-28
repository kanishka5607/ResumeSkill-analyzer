from typing import List, Dict, Any

class GapAnalyzer:
    """
    Prioritized Skill Gap Analyzer.
    Ranks missing and weakly evidenced skills by business criticality,
    requirement status, and estimated effort to bridge.
    """

    EFFORT_ESTIMATES = {
        "Critical": "3-4 weeks (Foundational study + practical capstone project)",
        "High": "2-3 weeks (Project implementation & resume documentation)",
        "Medium": "1-2 weeks (Targeted exercises & metric enhancement)",
        "Low": "3-5 days (Syntax review & portfolio bullet polish)"
    }

    def analyze_gaps(self, match_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract and prioritize gaps from match results.
        """
        gap_items = []

        for item in match_results:
            status = item.get("candidate_status", "Missing Skill")
            req_type = item.get("requirement_type", "Required")
            ev_score = float(item.get("evidence_confidence", 0.0))
            name = item.get("canonical_name", "Skill")

            # Determine if this item constitutes a gap
            is_gap = False
            priority = "Low"
            reason = ""

            if status == "Missing Skill":
                is_gap = True
                if req_type == "Required":
                    priority = "Critical"
                    reason = f"Essential core requirement for the role. Completely absent from candidate resume evidence."
                else:
                    priority = "Medium"
                    reason = f"Preferred requirement. Not found in resume, but would strengthen competitiveness."
            elif status == "Claimed Match":
                is_gap = True
                if req_type == "Required":
                    priority = "High"
                    reason = f"Required skill is listed, but has 0 supporting project or work experience sentences in your resume."
                else:
                    priority = "Low"
                    reason = f"Preferred skill claimed without project details."
            elif status == "Partial Match" and ev_score < 45.0:
                is_gap = True
                if req_type == "Required":
                    priority = "High" if ev_score < 30.0 else "Medium"
                    reason = f"Required skill has introductory or related evidence ({int(ev_score)}/100). Needs direct project outcome."
                else:
                    priority = "Low"
                    reason = f"Preferred skill has partial evidence ({int(ev_score)}/100)."
            elif status == "Needs Review":
                is_gap = True
                priority = "Medium"
                reason = "Ambiguous match requiring human inspection and project reinforcement."

            if is_gap:
                gap_items.append({
                    "skill_id": item.get("skill_id", 0),
                    "canonical_name": name,
                    "category": item.get("category", "General"),
                    "requirement_type": req_type,
                    "candidate_status": status,
                    "gap_priority": priority,
                    "evidence_confidence": ev_score,
                    "explanation": reason,
                    "recommended_action": item.get("recommended_action", f"Build a practical project utilizing {name}."),
                    "estimated_effort": self.EFFORT_ESTIMATES.get(priority, "1-2 weeks"),
                    "supporting_excerpts": item.get("supporting_excerpts", [])
                })

        # Sort priority: Critical -> High -> Medium -> Low
        priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
        gap_items.sort(key=lambda x: (priority_order.get(x["gap_priority"], 4), -x["evidence_confidence"]))

        return gap_items

gap_analyzer = GapAnalyzer()
