# Scoring Methodology & Explainable Formulas

This platform rejects "black-box" magic percentages. All metrics are calculated through transparent heuristic models explained to the candidate.

---

### 1. Evidence Confidence Score (0–100 Scale)

Measures how strongly a candidate's resume supports a specific claimed skill.

#### Primary Source Weights:
- **Practical Capstone Project**: 40 points
- **Internship / Professional Work Experience**: 35 points
- **Relevant Formal Certification**: 20 points
- **Academic Coursework / Degree**: 10 points
- **Skill-List-Only Mention**: 5 points

#### Context Modifiers:
- **Active Implementation Verbs** (+15 points): "developed", "architected", "engineered", "implemented", "optimized", "trained", "deployed".
- **Quantifiable Metrics & Outcomes** (+15 points): percentages (e.g. 35%), user scale, latency reductions, data volume.
- **Multi-Source Corroboration** (+10 points): Present across multiple distinct sections.

#### Score Boundaries:
- **80–100**: Strong resume evidence (backed by project + metrics).
- **50–79**: Moderate resume evidence (practical application without heavy metrics).
- **20–49**: Limited resume evidence (introductory coursework or brief context).
- **0–19**: Very limited or no identified supporting evidence (claimed only in skills list).

---

### 2. Skill Proof Score (0–100 Scale)

Measures what fraction of the candidate's claimed skills are backed by verifiable evidence.

$$\text{Skill Proof Score} = \left(\frac{\sum \text{Evidence Contributions}}{\text{Total Distinct Claimed Skills}}\right) \times 100$$

Where contributions are:
- Strong Evidence ($\ge 50$): $1.0$
- Moderate Evidence ($25 - 49$): $0.7$
- Weak Evidence ($1 - 24$): $0.3$
- No Evidence ($0$): $0.0$

---

### 3. Job Readiness Score (0–100 Scale)

Evaluates candidate resume evidence against a target job role.

$$\text{Job Readiness Score} = \left(\frac{\sum (\text{Contribution} \times \text{Requirement Weight})}{\sum \text{Requirement Weights}}\right) \times 100$$

#### Requirement Weights:
- **Required Skill**: 2.0x weight
- **Preferred Skill**: 1.0x weight

#### Requirement Match Contributions:
- **Strong Match** (Required skill with evidence $\ge 50$): $1.00$
- **Partial Match** (Moderate evidence or related technology): $0.70$
- **Claimed Match** (Mentioned in skills list, no project proof): $0.30$
- **Missing Skill** (Not present in resume): $0.00$

---

### 4. Skill Gap Prioritization Rules

Skill gaps are ranked into four strict priority tiers:
1. **Critical Priority**: Core required skill completely missing from candidate resume.
2. **High Priority**: Core required skill claimed without project proof, or with weak evidence ($< 30\%$).
3. **Medium Priority**: Preferred skill that is missing, or required skill with partial evidence ($30 - 45\%$).
4. **Low Priority**: Preferred skill with claimed or partial evidence.
