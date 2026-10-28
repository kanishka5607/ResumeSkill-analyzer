from typing import List, Dict, Any

class RoadmapGenerator:
    """
    Actionable 7-Step Upskilling Roadmap Generator.
    Turns priority skill gaps into a structured milestone journey:
    Learn -> Practice -> Build -> Document -> Resume Update -> Re-Analyze.
    """

    def generate_skill_roadmap(
        self,
        skill_name: str,
        category: str,
        gap_priority: str,
        requirement_type: str,
        current_evidence_score: float,
        resources: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Produce a tailored 7-step roadmap for a specific gap skill.
        """
        steps = [
            {
                "step_number": 1,
                "title": f"Master {skill_name} Core Fundamentals",
                "action_type": "Foundations",
                "description": f"Study the essential concepts, standard syntax, and foundational architecture of {skill_name}.",
                "estimated_time": "3-5 days",
                "milestone_outcome": f"Understand core {skill_name} terminology, syntax patterns, and best practices."
            },
            {
                "step_number": 2,
                "title": f"Guided Hands-on Practice",
                "action_type": "Practice",
                "description": f"Complete interactive tutorials, exercises, or guided labs working directly with {skill_name}.",
                "estimated_time": "4-6 days",
                "milestone_outcome": f"Solve 10+ standard problems and build basic functional scripts/components in {skill_name}."
            },
            {
                "step_number": 3,
                "title": f"Implement Practical Workflows",
                "action_type": "Exercises",
                "description": f"Integrate {skill_name} with common complementary tools in its ecosystem (e.g. database, APIs, version control).",
                "estimated_time": "3-5 days",
                "milestone_outcome": f"Demonstrate multi-tool integration and automated testing using {skill_name}."
            },
            {
                "step_number": 4,
                "title": f"Build an End-to-End Capstone Project",
                "action_type": "Project Development",
                "description": f"Design and implement a realistic portfolio project addressing a real-world problem using {skill_name}.",
                "estimated_time": "7-10 days",
                "milestone_outcome": f"A fully functional project featuring clean code, modular structure, and error handling."
            },
            {
                "step_number": 5,
                "title": "Document Project Architecture & Outcomes",
                "action_type": "Documentation",
                "description": f"Create a comprehensive GitHub README with architecture diagrams, setup instructions, and measurable achievements.",
                "estimated_time": "1-2 days",
                "milestone_outcome": "Public repository link with professional documentation and live demo link."
            },
            {
                "step_number": 6,
                "title": "Incorporate Evidence into Resume",
                "action_type": "Resume Update",
                "description": (
                    f"Write 2-3 strong resume bullet points starting with active verbs ('Developed...', 'Architected...'), "
                    f"specifying {skill_name}, and including measurable impact or user metrics."
                ),
                "estimated_time": "1 day",
                "milestone_outcome": f"Updated resume bullet points with concrete {skill_name} implementation evidence."
            },
            {
                "step_number": 7,
                "title": "Re-Analyze Resume on the Platform",
                "action_type": "Closed-Loop Verification",
                "description": "Upload the updated resume to verify that evidence classification upgrades to 'Evidence-Backed Skill' and readiness score increases.",
                "estimated_time": "15 minutes",
                "milestone_outcome": f"Verified score improvement and resolved gap for {skill_name}."
            }
        ]

        return {
            "skill_name": skill_name,
            "category": category,
            "gap_priority": gap_priority,
            "requirement_type": requirement_type,
            "current_evidence_score": current_evidence_score,
            "steps": steps,
            "resources": resources
        }

roadmap_generator = RoadmapGenerator()
