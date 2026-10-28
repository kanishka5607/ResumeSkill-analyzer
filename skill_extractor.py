import re
from typing import Dict, List, Any, Optional, Set, Tuple

class SkillExtractor:
    """
    Rule-based skill extraction engine with word-boundary matching,
    alias normalization, and source sentence attribution.
    """

    def __init__(self, taxonomy: Optional[Dict[str, Dict[str, Any]]] = None):
        # Default built-in taxonomy if database is initializing or offline
        self.taxonomy = taxonomy or self._get_default_taxonomy()
        self._build_alias_map()

    def _get_default_taxonomy(self) -> Dict[str, Dict[str, Any]]:
        return {
            # Programming Languages
            "Python": {"category": "Programming Languages", "aliases": ["python", "python3", "py"]},
            "Java": {"category": "Programming Languages", "aliases": ["java", "core java", "j2se", "jdk"]},
            "JavaScript": {"category": "Programming Languages", "aliases": ["javascript", "js", "ecmascript", "es6"]},
            "TypeScript": {"category": "Programming Languages", "aliases": ["typescript", "ts"]},
            "C": {"category": "Programming Languages", "aliases": ["c language", "c programming"]},
            "C++": {"category": "Programming Languages", "aliases": ["c++", "cpp"]},
            "C#": {"category": "Programming Languages", "aliases": ["c#", "csharp", "c-sharp"]},
            "Go": {"category": "Programming Languages", "aliases": ["golang", "go language"]},
            "Rust": {"category": "Programming Languages", "aliases": ["rust", "rustlang"]},
            "PHP": {"category": "Programming Languages", "aliases": ["php", "php8"]},
            "Ruby": {"category": "Programming Languages", "aliases": ["ruby"]},
            "Swift": {"category": "Programming Languages", "aliases": ["swift"]},
            "Kotlin": {"category": "Programming Languages", "aliases": ["kotlin"]},
            "R": {"category": "Programming Languages", "aliases": ["r language", "r programming"]},
            "SQL": {"category": "Database", "aliases": ["sql", "structured query language"]},

            # Web Development
            "HTML": {"category": "Web Development", "aliases": ["html", "html5"]},
            "CSS": {"category": "Web Development", "aliases": ["css", "css3"]},
            "React": {"category": "Web Development", "aliases": ["react", "react.js", "reactjs", "react native"]},
            "Angular": {"category": "Web Development", "aliases": ["angular", "angularjs", "angular 2+"]},
            "Vue.js": {"category": "Web Development", "aliases": ["vue", "vue.js", "vuejs"]},
            "Node.js": {"category": "Web Development", "aliases": ["node", "node.js", "nodejs"]},
            "Express": {"category": "Web Development", "aliases": ["express", "express.js", "expressjs"]},
            "FastAPI": {"category": "Web Development", "aliases": ["fastapi", "fast-api"]},
            "Django": {"category": "Web Development", "aliases": ["django", "django rest framework", "drf"]},
            "Flask": {"category": "Web Development", "aliases": ["flask"]},
            "Spring Boot": {"category": "Web Development", "aliases": ["spring boot", "springboot", "spring framework"]},
            "ASP.NET": {"category": "Web Development", "aliases": ["asp.net", ".net core", "dotnet"]},
            "Tailwind CSS": {"category": "Web Development", "aliases": ["tailwind", "tailwindcss"]},
            "Bootstrap": {"category": "Web Development", "aliases": ["bootstrap", "bootstrap 5"]},
            "Next.js": {"category": "Web Development", "aliases": ["next.js", "nextjs"]},
            "Redux": {"category": "Web Development", "aliases": ["redux", "redux toolkit"]},
            "REST API": {"category": "Web Development", "aliases": ["rest api", "restful api", "rest apis", "restful web services"]},
            "GraphQL": {"category": "Web Development", "aliases": ["graphql"]},

            # Database
            "SQLite": {"category": "Database", "aliases": ["sqlite", "sqlite3"]},
            "PostgreSQL": {"category": "Database", "aliases": ["postgresql", "postgres", "postgre sql", "psql"]},
            "MySQL": {"category": "Database", "aliases": ["mysql"]},
            "MongoDB": {"category": "Database", "aliases": ["mongodb", "mongo"]},
            "Redis": {"category": "Database", "aliases": ["redis"]},
            "Oracle Database": {"category": "Database", "aliases": ["oracle db", "oracle sql"]},
            "Cassandra": {"category": "Database", "aliases": ["cassandra", "apache cassandra"]},
            "DynamoDB": {"category": "Database", "aliases": ["dynamodb", "aws dynamodb"]},
            "Elasticsearch": {"category": "Database", "aliases": ["elasticsearch", "elastic search"]},

            # Data Science
            "NumPy": {"category": "Data Science", "aliases": ["numpy"]},
            "Pandas": {"category": "Data Science", "aliases": ["pandas"]},
            "Matplotlib": {"category": "Data Science", "aliases": ["matplotlib"]},
            "Seaborn": {"category": "Data Science", "aliases": ["seaborn"]},
            "Scikit-Learn": {"category": "Data Science", "aliases": ["scikit-learn", "sklearn", "scikit learn"]},
            "SciPy": {"category": "Data Science", "aliases": ["scipy"]},
            "Data Analysis": {"category": "Data Science", "aliases": ["data analysis", "data analytics", "exploratory data analysis", "eda"]},
            "Data Visualization": {"category": "Data Science", "aliases": ["data visualization", "data viz", "dashboard creation"]},
            "Data Cleaning": {"category": "Data Science", "aliases": ["data cleaning", "data preprocessing", "data wrangling"]},
            "Statistical Modeling": {"category": "Data Science", "aliases": ["statistical modeling", "statistics", "statistical analysis", "inferential statistics"]},
            "Feature Engineering": {"category": "Data Science", "aliases": ["feature engineering", "feature selection", "feature extraction"]},

            # AI & Machine Learning
            "Machine Learning": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["machine learning", "ml"]},
            "Deep Learning": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["deep learning", "dl", "neural networks"]},
            "Natural Language Processing": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["natural language processing", "nlp", "text processing"]},
            "Computer Vision": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["computer vision", "cv", "image processing"]},
            "Model Evaluation": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["model evaluation", "model validation", "hyperparameter tuning", "cross-validation"]},
            "TensorFlow": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["tensorflow", "tf"]},
            "PyTorch": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["pytorch"]},
            "Keras": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["keras"]},
            "HuggingFace": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["huggingface", "transformers library", "hugging face"]},
            "Large Language Models": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["llm", "large language models", "generative ai", "genai"]},
            "BERT": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["bert", "roberta"]},
            "LangChain": {"category": "Artificial Intelligence and Machine Learning", "aliases": ["langchain"]},

            # Tools & Platforms
            "Git": {"category": "Tools and Platforms", "aliases": ["git", "version control"]},
            "GitHub": {"category": "Tools and Platforms", "aliases": ["github"]},
            "GitLab": {"category": "Tools and Platforms", "aliases": ["gitlab"]},
            "Docker": {"category": "Tools and Platforms", "aliases": ["docker", "containerization"]},
            "Kubernetes": {"category": "Tools and Platforms", "aliases": ["kubernetes", "k8s"]},
            "Linux": {"category": "Tools and Platforms", "aliases": ["linux", "ubuntu", "bash", "shell scripting"]},
            "AWS": {"category": "Tools and Platforms", "aliases": ["aws", "amazon web services", "ec2", "s3", "lambda"]},
            "Azure": {"category": "Tools and Platforms", "aliases": ["azure", "microsoft azure"]},
            "Google Cloud Platform": {"category": "Tools and Platforms", "aliases": ["gcp", "google cloud", "google cloud platform"]},
            "CI/CD": {"category": "Tools and Platforms", "aliases": ["ci/cd", "continuous integration", "continuous deployment"]},
            "Postman": {"category": "Tools and Platforms", "aliases": ["postman", "api testing"]},
            "Jira": {"category": "Tools and Platforms", "aliases": ["jira"]},
            "Jenkins": {"category": "Tools and Platforms", "aliases": ["jenkins"]},

            # Soft Skills
            "Communication": {"category": "Soft Skills", "aliases": ["communication", "verbal communication", "written communication", "communication skills"]},
            "Teamwork": {"category": "Soft Skills", "aliases": ["teamwork", "team player", "collaboration", "cross-functional collaboration"]},
            "Problem Solving": {"category": "Soft Skills", "aliases": ["problem solving", "analytical thinking", "troubleshooting", "problem-solving"]},
            "Leadership": {"category": "Soft Skills", "aliases": ["leadership", "mentoring", "team lead", "guidance"]},
            "Time Management": {"category": "Soft Skills", "aliases": ["time management", "prioritization", "deadline management"]},
            "Adaptability": {"category": "Soft Skills", "aliases": ["adaptability", "flexibility", "fast learner", "quick learner"]},
            "Critical Thinking": {"category": "Soft Skills", "aliases": ["critical thinking", "logical reasoning"]}
        }

    def _build_alias_map(self):
        """Construct alias-to-canonical lookup and sorted regex patterns."""
        self.alias_to_canonical = {}
        alias_list = []

        for canonical, data in self.taxonomy.items():
            cat = data.get("category", "General")
            aliases = data.get("aliases", [])
            # Always map canonical name itself (case-insensitive)
            self.alias_to_canonical[canonical.lower()] = (canonical, cat)
            alias_list.append((canonical.lower(), canonical, cat))

            for alias in aliases:
                norm_alias = alias.lower().strip()
                self.alias_to_canonical[norm_alias] = (canonical, cat)
                alias_list.append((norm_alias, canonical, cat))

        # Sort aliases by length descending so longer phrases match before substrings
        # (e.g., 'machine learning' before 'learning', 'react native' before 'react')
        alias_list.sort(key=lambda x: len(x[0]), reverse=True)
        self.sorted_aliases = alias_list

    def extract_from_sections(self, sections: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Extract skills across all parsed sections with sentence isolation
        and false-positive protection.
        """
        extracted_skills: Dict[str, Dict[str, Any]] = {}

        for section_name, section_text in sections.items():
            sentences = self._split_into_sentences_and_bullets(section_text)
            
            for sentence in sentences:
                self._extract_from_sentence(sentence, section_name, extracted_skills)

        return list(extracted_skills.values())

    def _split_into_sentences_and_bullets(self, text: str) -> List[str]:
        """Split text into distinct sentences and bullet points."""
        lines = text.split("\n")
        units = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Remove leading bullet symbols (•, -, *, numbers like 1.)
            cleaned_line = re.sub(r"^[\s•\-\*]+|^\d+[\.\)]\s*", "", line).strip()
            if not cleaned_line:
                continue
            
            # Further split on sentence terminators (. followed by space, or ;)
            sub_sentences = re.split(r"(?<=[.!?])\s+", cleaned_line)
            for sub in sub_sentences:
                sub = sub.strip()
                if sub:
                    units.append(sub)
        return units

    def _extract_from_sentence(self, sentence: str, section_name: str, accumulator: Dict[str, Dict[str, Any]]):
        """
        Check for skill occurrences in a single sentence using strict word boundaries.
        Accumulates evidence text and section references.
        """
        sentence_lower = sentence.lower()

        # Track which spans have already been matched in this sentence to avoid double matching
        # (e.g., matching "Python" should not also match "py" inside the word Python)
        matched_spans: List[Tuple[int, int]] = []

        for alias, canonical, category in self.sorted_aliases:
            # Special handling for single or two-letter aliases like 'c', 'r', 'py', 'js', 'go'
            if len(alias) <= 2:
                # Require strict boundary and context check
                pattern = rf"(?<![\w\.\+#]){re.escape(alias)}(?![\w\.\+#])"
            else:
                pattern = rf"(?<![\w]){re.escape(alias)}(?![\w])"

            for match in re.finditer(pattern, sentence_lower):
                start, end = match.span()
                # Check if this span overlaps with an already matched longer span
                overlap = False
                for m_start, m_end in matched_spans:
                    if not (end <= m_start or start >= m_end):
                        overlap = True
                        break
                if overlap:
                    continue

                matched_spans.append((start, end))
                original_text = sentence[start:end]

                # Update or register the extracted skill in accumulator
                if canonical not in accumulator:
                    accumulator[canonical] = {
                        "canonical_name": canonical,
                        "category": category,
                        "original_text": original_text,
                        "section_name": section_name,
                        "extraction_confidence": 0.95 if section_name == "Skills" else 0.90,
                        "occurrences": [{
                            "section": section_name,
                            "sentence": sentence,
                            "matched_text": original_text
                        }],
                        "all_sections": {section_name}
                    }
                else:
                    accumulator[canonical]["occurrences"].append({
                        "section": section_name,
                        "sentence": sentence,
                        "matched_text": original_text
                    })
                    accumulator[canonical]["all_sections"].add(section_name)

    def extract_from_text(self, raw_text: str) -> List[Dict[str, Any]]:
        """Convenience method to extract skills from raw unstructured text."""
        return self.extract_from_sections({"General": raw_text})

skill_extractor = SkillExtractor()
