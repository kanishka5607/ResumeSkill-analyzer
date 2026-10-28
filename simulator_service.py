import copy
from typing import Dict, List, Any
from app.services.skill_extractor import skill_extractor
from app.services.evidence_analyzer import evidence_analyzer
from app.services.matching_engine import matching_engine
from app.services.readiness_scorer import readiness_scorer
from app.services.proof_scorer import proof_scorer

class SimulatorService:
    """
    Resume Improvement Simulator Service.
    Enables candidates to explore hypothetical improvements (projects, certs)
    and see their impact on evidence classification and readiness score before editing their actual resume.
    """

    DISCLAIMER = (
        "HYPOTHETICAL SIMULATION ONLY — NOT VERIFIED PROOF. Simulated score improvements are rule-based "
        "heuristic projections. They do not constitute verified skill proof, employment credentials, or hiring suitability. "
        "Add this evidence to your actual resume only after completing the actual work."
    )

    def run_simulation(
        self,
        base_skills: List[Dict[str, Any]],
        role_requirements: List[Dict[str, Any]],
        simulated_changes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculates hypothetical scores given simulated project or certification descriptions.
        """
        # Calculate baseline scores
        baseline_matches = matching_engine.match_candidate_against_requirements(base_skills, role_requirements)
        baseline_readiness = readiness_scorer.calculate_readiness_score(baseline_matches)["overall_score"]
        baseline_proof = proof_scorer.calculate_skill_proof_score(base_skills)["skill_proof_score"]

        # Create simulated virtual sections
        simulated_sections = {"Projects": "", "Certifications": ""}
        for change in simulated_changes:
            ch_type = change.get("change_type", "Project")
            title = change.get("title", "Project")
            desc = change.get("description", "")
            techs = ", ".join(change.get("technologies", []))
            outcomes = change.get("outcomes", "")

            synthetic_text = f"{title}. {desc} Technologies used: {techs}. Outcomes: {outcomes}."
            if "Cert" in ch_type:
                simulated_sections["Certifications"] += "\n" + synthetic_text
            else:
                simulated_sections["Projects"] += "\n" + synthetic_text

        # Extract skills from simulated additions
        simulated_extracted = skill_extractor.extract_from_sections(simulated_sections)

        # Merge base skills with simulated skills
        # If skill already exists in base, enhance its occurrences
        merged_skills_dict = {}
        for s in base_skills:
            cname = s["canonical_name"]
            merged_skills_dict[cname] = copy.deepcopy(s)

        for s in simulated_extracted:
            cname = s["canonical_name"]
            if cname in merged_skills_dict:
                # Append simulated occurrences
                existing = merged_skills_dict[cname]
                existing_occ = existing.get("occurrences", [])
                existing_occ.extend(s.get("occurrences", []))
                existing["occurrences"] = existing_occ
                existing["all_sections"] = set(existing.get("all_sections", [])) | set(s.get("all_sections", []))
            else:
                merged_skills_dict[cname] = s

        # Re-run evidence analysis on all merged skills
        simulated_analyzed_skills = []
        for s in merged_skills_dict.values():
            analyzed = evidence_analyzer.analyze_skill_evidence(s)
            simulated_analyzed_skills.append(analyzed)

        # Re-run matching and scoring
        simulated_matches = matching_engine.match_candidate_against_requirements(simulated_analyzed_skills, role_requirements)
        simulated_readiness_data = readiness_scorer.calculate_readiness_score(simulated_matches)
        simulated_readiness = simulated_readiness_data["overall_score"]
        simulated_proof = proof_scorer.calculate_skill_proof_score(simulated_analyzed_skills)["skill_proof_score"]

        # Track effects on specific simulated skills
        simulated_skill_effects = []
        for ch in simulated_changes:
            target_skill = ch.get("skill_name", "")
            # Find in base vs simulated
            base_skill_info = next((b for b in base_skills if b["canonical_name"].lower() == target_skill.lower()), None)
            sim_skill_info = next((m for m in simulated_analyzed_skills if m["canonical_name"].lower() == target_skill.lower()), None)

            old_conf = base_skill_info["evidence_confidence"] if base_skill_info else 0.0
            old_class = base_skill_info["evidence_classification"] if base_skill_info else "Missing"

            new_conf = sim_skill_info["evidence_confidence"] if sim_skill_info else 0.0
            new_class = sim_skill_info["evidence_classification"] if sim_skill_info else "Unknown"

            simulated_skill_effects.append({
                "skill_name": target_skill,
                "previous_classification": old_class,
                "simulated_classification": new_class,
                "previous_confidence": old_conf,
                "simulated_confidence": new_conf,
                "status_upgrade": f"{old_class} ➔ {new_class}"
            })

        return {
            "original_readiness_score": baseline_readiness,
            "simulated_readiness_score": simulated_readiness,
            "score_delta": round(simulated_readiness - baseline_readiness, 1),
            "original_proof_score": baseline_proof,
            "simulated_proof_score": simulated_proof,
            "proof_delta": round(simulated_proof - baseline_proof, 1),
            "simulated_skill_effects": simulated_skill_effects,
            "disclaimer": self.DISCLAIMER
        }

simulator_service = SimulatorService()
