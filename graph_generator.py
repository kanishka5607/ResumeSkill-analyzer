from typing import List, Dict, Any

class GraphGenerator:
    """
    Skill Evidence Graph Generator.
    Builds an interconnected knowledge graph of Candidate -> Skills -> Evidence -> Job Roles -> Gaps -> Upskilling.
    """

    def generate_graph(
        self,
        candidate_name: str,
        skills: List[Dict[str, Any]],
        role_title: str,
        match_results: List[Dict[str, Any]],
        projects: List[str] = []
    ) -> Dict[str, Any]:
        """
        Creates node-link graph data representing candidate evidence and target role requirements.
        """
        nodes = []
        edges = []
        node_ids = set()

        def add_node(node_id: str, label: str, node_type: str, **kwargs):
            if node_id not in node_ids:
                node_ids.add(node_id)
                nodes.append({
                    "id": node_id,
                    "label": label,
                    "type": node_type,
                    **kwargs
                })

        def add_edge(source: str, target: str, label: str, edge_type: str, weight: float = 1.0):
            edges.append({
                "source": source,
                "target": target,
                "label": label,
                "type": edge_type,
                "weight": weight
            })

        # 1. Candidate Central Node
        candidate_id = "node_candidate"
        add_node(candidate_id, candidate_name or "Candidate Profile", "candidate", score=100.0)

        # 2. Target Job Role Node
        role_id = "node_role"
        add_node(role_id, role_title or "Target Role", "job_role")
        add_edge(candidate_id, role_id, "targets", "target_role", weight=2.0)

        # 3. Add Project Nodes
        for idx, proj_name in enumerate(projects[:4]):
            proj_id = f"node_proj_{idx}"
            add_node(proj_id, proj_name[:30] + ("..." if len(proj_name) > 30 else ""), "project")
            add_edge(candidate_id, proj_id, "completed", "project_edge", weight=1.5)

        # 4. Add Skills Nodes and link to candidate and projects
        for s in skills:
            s_name = s.get("canonical_name", "Skill")
            s_id = f"skill_{s_name.lower().replace(' ', '_')}"
            ev_class = s.get("evidence_classification", "Claimed Skill")
            conf = float(s.get("evidence_confidence", 0.0))
            category = s.get("category", "General")

            add_node(s_id, s_name, "skill", category=category, score=conf, status=ev_class)
            add_edge(candidate_id, s_id, "claims", "skill_claim", weight=1.0)

            # If evidence has projects, link to projects
            ev_records = s.get("evidence_records", [])
            for r_idx, rec in enumerate(ev_records):
                if rec.get("evidence_type") == "Project":
                    # Link to a project node if exists, or create a project evidence node
                    proj_text = rec.get("evidence_text", "")
                    proj_snippet = proj_text.split(".")[0][:35]
                    p_id = f"proj_ev_{s_name.lower()}_{r_idx}"
                    add_node(p_id, proj_snippet or "Project Context", "project")
                    add_edge(p_id, s_id, "demonstrates", "evidence_link", weight=1.8)
                    add_edge(candidate_id, p_id, "built", "project_edge", weight=1.2)
                    break

        # 5. Link Requirements from Match Results
        for match in match_results:
            req_name = match.get("canonical_name", "Requirement")
            s_id = f"skill_{req_name.lower().replace(' ', '_')}"
            status = match.get("candidate_status", "Missing Skill")
            req_type = match.get("requirement_type", "Required")

            if status == "Missing Skill":
                gap_id = f"gap_{req_name.lower().replace(' ', '_')}"
                add_node(gap_id, f"Missing: {req_name}", "gap", status="Missing", category=req_type)
                add_edge(role_id, gap_id, f"requires ({req_type})", "requirement_gap", weight=2.0)
                
                # Add learning roadmap node for missing skills
                learn_id = f"learn_{req_name.lower().replace(' ', '_')}"
                add_node(learn_id, f"Upskilling: {req_name}", "learning", category=req_type)
                add_edge(gap_id, learn_id, "resolved by", "roadmap_link", weight=1.5)
            elif status in ("Partial Match", "Claimed Match"):
                gap_id = f"gap_{req_name.lower().replace(' ', '_')}"
                gap_label = f"Needs Practice: {req_name}" if status == "Partial Match" else f"Needs Evidence: {req_name}"
                add_node(gap_id, gap_label, "gap", status=status, category=req_type)
                add_edge(role_id, gap_id, f"requires ({req_type})", "requirement_gap", weight=1.8)
                if s_id in node_ids:
                    add_edge(gap_id, s_id, "based on", "gap_evidence", weight=1.2)
                    add_edge(role_id, s_id, f"requires ({req_type})", "role_match", weight=1.5)
                learn_id = f"learn_{req_name.lower().replace(' ', '_')}"
                add_node(learn_id, f"Upskilling: {req_name}", "learning", category=req_type)
                add_edge(gap_id, learn_id, "deepen via", "roadmap_link", weight=1.5)
            else:
                # Skill is in profile and Strong Match, link to role
                if s_id in node_ids:
                    add_edge(role_id, s_id, f"requires ({req_type})", "role_match", weight=2.0)

        return {
            "nodes": nodes,
            "edges": edges
        }

graph_generator = GraphGenerator()
