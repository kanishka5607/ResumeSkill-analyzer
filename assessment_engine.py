from typing import Dict, List, Any, Optional

SKILL_PROGRESSION_MAP: Dict[str, Dict[str, Any]] = {
    "SQL": {
        "level": "Intermediate",
        "next_topics": [
            {
                "topic": "Advanced SQL & Window Functions",
                "description": "Master ROW_NUMBER(), DENSE_RANK(), LEAD(), LAG(), and CTEs (Common Table Expressions) for complex reporting.",
                "difficulty": "Intermediate",
                "estimated_hours": "8-12 hours"
            },
            {
                "topic": "Query Optimization & Database Indexing",
                "description": "Learn B-Tree and Hash indexing, EXPLAIN ANALYZE query plans, index fragmentation, and eliminating full table scans.",
                "difficulty": "Advanced",
                "estimated_hours": "10-15 hours"
            },
            {
                "topic": "Database Architecture & ACID Transactions",
                "description": "Study WAL (Write-Ahead Logging), isolation levels (Read Committed, Repeatable Read, Serializable), and database sharding.",
                "difficulty": "Advanced",
                "estimated_hours": "12-16 hours"
            },
            {
                "topic": "Data Modeling & Data Warehousing (Star & Snowflake Schema)",
                "description": "Design dimensional schemas, fact & dimension tables, slow-changing dimensions (SCD), and analytics pipelines.",
                "difficulty": "Advanced",
                "estimated_hours": "15-20 hours"
            }
        ],
        "questions": [
            {
                "id": 1,
                "question": "What is the key functional difference between the WHERE and HAVING clauses in SQL?",
                "options": [
                    "WHERE filters rows before aggregation; HAVING filters aggregated groups after GROUP BY.",
                    "WHERE is only used with numbers; HAVING is used with strings.",
                    "WHERE can only be used once per query; HAVING can be chained multiple times.",
                    "There is no difference; they are interchangeable aliases."
                ],
                "correct_index": 0,
                "explanation": "WHERE filters individual table rows prior to aggregation, while HAVING filters grouped results produced by the GROUP BY clause."
            },
            {
                "id": 2,
                "question": "Which SQL JOIN returns all rows from the left table and matched rows from the right table, filling unmatched right columns with NULL?",
                "options": [
                    "INNER JOIN",
                    "LEFT OUTER JOIN",
                    "CROSS JOIN",
                    "RIGHT OUTER JOIN"
                ],
                "correct_index": 1,
                "explanation": "LEFT JOIN (or LEFT OUTER JOIN) preserves all records from the left table regardless of whether there is a match in the right table."
            },
            {
                "id": 3,
                "question": "How does creating a B-Tree index on a column impact database read and write operations?",
                "options": [
                    "Accelerates SELECT lookups with O(log N) search times, but adds minor overhead to INSERT/UPDATE/DELETE operations.",
                    "Speeds up write operations while slowing down read operations.",
                    "Eliminates the need for a PRIMARY KEY constraint.",
                    "Compacts the database table size by 50% automatically."
                ],
                "correct_index": 0,
                "explanation": "Indexes create sorted tree structures that drastically speed up WHERE lookups and range scans, but require updating upon writes."
            },
            {
                "id": 4,
                "question": "What will happen if you execute a SELECT query containing aggregate functions (e.g. SUM(), COUNT()) alongside non-aggregated columns without a GROUP BY clause in standard SQL?",
                "options": [
                    "The query will execute and assign the average value to all non-aggregated columns.",
                    "The SQL engine will raise a syntax error because non-aggregated columns must appear in the GROUP BY clause.",
                    "The database will automatically delete duplicate non-aggregated records.",
                    "The query will return only the first row of the table."
                ],
                "correct_index": 1,
                "explanation": "Standard SQL requires every non-aggregated column selected alongside an aggregate function to be explicitly included in GROUP BY."
            },
            {
                "id": 5,
                "question": "Which foreign key constraint action automatically deletes associated child records when a referenced parent record is removed?",
                "options": [
                    "ON DELETE RESTRICT",
                    "ON DELETE SET NULL",
                    "ON DELETE CASCADE",
                    "ON DELETE NO ACTION"
                ],
                "correct_index": 2,
                "explanation": "ON DELETE CASCADE guarantees referential integrity by propagating the deletion of the parent entity to all associated child records."
            }
        ]
    },
    "Python": {
        "level": "Intermediate",
        "next_topics": [
            {
                "topic": "Asynchronous Programming (asyncio & await)",
                "description": "Understand non-blocking I/O event loops, coroutines, tasks, and high-concurrency microservices.",
                "difficulty": "Intermediate",
                "estimated_hours": "8-12 hours"
            },
            {
                "topic": "FastAPI & Production Web Microservices",
                "description": "Build high-throughput REST APIs with Pydantic validation, dependency injection, and automatic Swagger docs.",
                "difficulty": "Intermediate",
                "estimated_hours": "12-16 hours"
            },
            {
                "topic": "Object-Oriented Design Patterns & Metaclasses",
                "description": "Learn SOLID principles, Singleton, Factory, and Observer patterns, and Python dunder methods.",
                "difficulty": "Advanced",
                "estimated_hours": "10-14 hours"
            }
        ],
        "questions": [
            {
                "id": 1,
                "question": "What is the primary difference between Python lists and tuples?",
                "options": [
                    "Lists are mutable and defined with square brackets; tuples are immutable and defined with parentheses.",
                    "Lists can only store integers; tuples can store any data type.",
                    "Lists have fixed size; tuples can grow dynamically.",
                    "Lists are executed in C; tuples are interpreted in Python."
                ],
                "correct_index": 0,
                "explanation": "Lists are mutable (can be appended, modified, reordered), while tuples are immutable, memory-efficient, and hashable."
            },
            {
                "id": 2,
                "question": "What does a generator function using the 'yield' keyword provide over returning a standard list?",
                "options": [
                    "It converts integers into strings automatically.",
                    "Memory efficiency by lazily producing values one at a time on demand rather than storing the entire sequence in RAM.",
                    "Multithreading support across multiple CPU cores.",
                    "Encrypted serialization for network transfer."
                ],
                "correct_index": 1,
                "explanation": "Generators maintain their state between calls and yield items on the fly, enabling processing of massive or infinite datasets without exhausting memory."
            },
            {
                "id": 3,
                "question": "In Python error handling, when does the 'finally' block execute?",
                "options": [
                    "Only if an exception was caught by an 'except' block.",
                    "Only if no exceptions occurred.",
                    "Always, regardless of whether an exception was raised, caught, or unhandled.",
                    "Only if the program exits normally."
                ],
                "correct_index": 2,
                "explanation": "The 'finally' clause is guaranteed to run in all circumstances, making it the standard location for cleanup (e.g. closing files or sockets)."
            },
            {
                "id": 4,
                "question": "What is the time complexity of checking membership ('x in my_set') in a Python set containing N elements on average?",
                "options": [
                    "O(N)",
                    "O(N^2)",
                    "O(1)",
                    "O(log N)"
                ],
                "correct_index": 2,
                "explanation": "Python sets are implemented using hash tables, giving average-case O(1) constant time lookups compared to O(N) linear time for lists."
            },
            {
                "id": 5,
                "question": "What is the purpose of Python's Global Interpreter Lock (GIL)?",
                "options": [
                    "It prevents unauthorized users from executing Python scripts.",
                    "A mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes at once.",
                    "It automatically compiles Python into machine code.",
                    "It enforces PEP 8 styling conventions at runtime."
                ],
                "correct_index": 1,
                "explanation": "The GIL is a CPython mechanism ensuring thread-safety for memory management by restricting bytecode execution to one thread at a time."
            }
        ]
    },
    "React": {
        "level": "Intermediate",
        "next_topics": [
            {
                "topic": "TypeScript with React & Strict Typing",
                "description": "Define generic component props, union state types, and custom typed hooks.",
                "difficulty": "Intermediate",
                "estimated_hours": "8-10 hours"
            },
            {
                "topic": "Global State Architecture (Redux Toolkit & Zustand)",
                "description": "Manage multi-component shared state, asynchronous thunks, selectors, and immutable state slices.",
                "difficulty": "Intermediate",
                "estimated_hours": "10-14 hours"
            },
            {
                "topic": "Full-Stack Server Components with Next.js App Router",
                "description": "Explore Server-Side Rendering (SSR), Server Actions, Streaming, and Static Site Generation (SSG).",
                "difficulty": "Advanced",
                "estimated_hours": "15-20 hours"
            }
        ],
        "questions": [
            {
                "id": 1,
                "question": "What causes a React functional component to re-render?",
                "options": [
                    "Changes to its state (via useState), changes to its props, or the re-rendering of its parent component.",
                    "Every time a user moves their mouse over the browser window.",
                    "Only when window.location changes.",
                    "Only when an external API returns data."
                ],
                "correct_index": 0,
                "explanation": "React components re-render when internal state updates, incoming props change, or the parent component triggers a render pass."
            },
            {
                "id": 2,
                "question": "Why does React require a unique 'key' prop when rendering lists of elements?",
                "options": [
                    "Keys determine the CSS styling of each element.",
                    "Keys help React identify which items have changed, been added, or been removed during Virtual DOM reconciliation.",
                    "Keys encrypt elements before sending them over WebSockets.",
                    "Keys are strictly required by HTML5 standards."
                ],
                "correct_index": 1,
                "explanation": "Unique keys allow React's diffing algorithm to preserve component state and avoid recreating unchanged DOM nodes."
            },
            {
                "id": 3,
                "question": "What happens if you omit the dependency array in a useEffect hook: useEffect(() => {...})?",
                "options": [
                    "The effect will run only once when the component mounts.",
                    "The effect will never run.",
                    "The effect will run after every single render of the component.",
                    "React will throw a compile-time syntax error."
                ],
                "correct_index": 2,
                "explanation": "Without a dependency array, useEffect executes after initial mount and after every subsequent update/render."
            },
            {
                "id": 4,
                "question": "What is the primary benefit of the Virtual DOM in modern frontend frameworks?",
                "options": [
                    "It eliminates the need for JavaScript.",
                    "It batches updates and calculates minimal differences (diffing) before performing expensive real browser DOM manipulations.",
                    "It stores all user passwords in memory securely.",
                    "It automatically creates responsive CSS media queries."
                ],
                "correct_index": 1,
                "explanation": "Direct browser DOM manipulations cause costly reflows and repaints; the Virtual DOM batches and computes minimal actual DOM writes."
            },
            {
                "id": 5,
                "question": "What hook is used to optimize performance by memoizing an expensive calculation between renders?",
                "options": [
                    "useCallback",
                    "useMemo",
                    "useRef",
                    "useContext"
                ],
                "correct_index": 1,
                "explanation": "useMemo caches the result of an expensive calculation, recalculating only when specified dependencies change."
            }
        ]
    },
    "Data Analysis": {
        "level": "Intermediate",
        "next_topics": [
            {
                "topic": "Exploratory Data Analysis (EDA) & Multivariate Statistics",
                "description": "Learn correlation matrices, feature distributions, pairwise relationships, and anomaly detection.",
                "difficulty": "Intermediate",
                "estimated_hours": "8-12 hours"
            },
            {
                "topic": "Feature Engineering & Data Pipeline Architecture",
                "description": "One-hot encoding, target encoding, outlier winsorization, log transformations, and automated cleaning pipelines.",
                "difficulty": "Intermediate",
                "estimated_hours": "10-15 hours"
            },
            {
                "topic": "Predictive Modeling with Scikit-Learn",
                "description": "Train linear/logistic regression, random forests, hyperparameter tuning via GridSearchCV, and cross-validation.",
                "difficulty": "Advanced",
                "estimated_hours": "15-20 hours"
            }
        ],
        "questions": [
            {
                "id": 1,
                "question": "Which measure of central tendency is least sensitive to extreme outliers in a skewed distribution?",
                "options": [
                    "Mean (Arithmetic Average)",
                    "Median (50th Percentile)",
                    "Standard Deviation",
                    "Variance"
                ],
                "correct_index": 1,
                "explanation": "The median divides sorted data into equal halves and is resistant to extreme high or low outlier values, unlike the mean."
            },
            {
                "id": 2,
                "question": "What does a Pearson correlation coefficient of -0.85 between two numerical variables indicate?",
                "options": [
                    "No relationship between the variables.",
                    "A strong negative linear relationship (as one variable increases, the other decreases).",
                    "A strong positive linear relationship.",
                    "That the first variable caused the second variable to decrease."
                ],
                "correct_index": 1,
                "explanation": "Values near -1.0 signify a strong inverse linear relationship; note that correlation does not establish causality."
            },
            {
                "id": 3,
                "question": "When preprocessing a dataset containing missing values, what is a primary drawback of simply dropping rows with NaN?",
                "options": [
                    "It causes the dataset to become encrypted.",
                    "It can introduce selection bias and discard valuable predictive information, especially if data is Not Missing At Random (NMAR).",
                    "It forces all numeric columns to convert to strings.",
                    "It makes SQL queries execute slower."
                ],
                "correct_index": 1,
                "explanation": "Listwise deletion reduces sample size and can distort underlying distributions if the missingness pattern correlates with outcomes."
            },
            {
                "id": 4,
                "question": "What type of chart is most suitable for visualizing the 5-number summary (minimum, Q1, median, Q3, maximum) and identifying outliers?",
                "options": [
                    "Pie Chart",
                    "Box Plot (Box-and-Whisker)",
                    "Donut Chart",
                    "Radar Chart"
                ],
                "correct_index": 1,
                "explanation": "Box plots display quartile boundaries, interquartile range (IQR), median line, and individual outlier points beyond whiskers."
            },
            {
                "id": 5,
                "question": "Why is feature scaling (e.g. StandardScaler or MinMaxScaler) critical before applying distance-based algorithms like KNN or K-Means?",
                "options": [
                    "Because features with larger raw magnitudes will dominate the Euclidean distance calculation regardless of their true importance.",
                    "Because scaling reduces the number of columns in the dataset.",
                    "Because algorithms will fail to compile without scaled floats.",
                    "Because it converts non-linear patterns into linear patterns."
                ],
                "correct_index": 0,
                "explanation": "Distance calculations rely on coordinate differences; unscaled features with large numerical ranges overshadow features with small ranges."
            }
        ]
    }
}

class AssessmentEngine:
    """
    Engine for generating skill verification assessments and learning progression paths.
    """

    def get_assessment_for_skill(self, skill_name: str) -> Dict[str, Any]:
        """
        Retrieve a 5-question practical assessment for a specific skill.
        Fallback to dynamically adapted questions for unmapped taxonomy skills.
        """
        clean_name = skill_name.strip()
        matched = None
        for key in SKILL_PROGRESSION_MAP:
            if key.lower() == clean_name.lower():
                matched = SKILL_PROGRESSION_MAP[key]
                break

        if matched:
            return {
                "skill_name": clean_name,
                "passing_score_percent": 80,
                "total_questions": len(matched["questions"]),
                "questions": [
                    {
                        "id": q["id"],
                        "question": q["question"],
                        "options": q["options"]
                    }
                    for q in matched["questions"]
                ],
                "next_topics": matched["next_topics"]
            }

        # Dynamic fallback questions for any taxonomy skill
        return {
            "skill_name": clean_name,
            "passing_score_percent": 80,
            "total_questions": 4,
            "questions": [
                {
                    "id": 1,
                    "question": f"What is the foundational role and purpose of {clean_name} in modern software engineering?",
                    "options": [
                        f"Provides industry-standard capabilities for modular development and scalable execution of {clean_name} workflows.",
                        f"{clean_name} is only used for temporary data backup.",
                        f"{clean_name} is an outdated legacy tool with no modern use cases.",
                        f"{clean_name} is exclusively used for visual graphic design."
                    ]
                },
                {
                    "id": 2,
                    "question": f"When implementing practical projects with {clean_name}, which practice best demonstrates professional engineering?",
                    "options": [
                        "Writing modular code, comprehensive automated tests, clear documentation, and error handling.",
                        "Putting all logic into a single monolithic script with no comments.",
                        "Avoiding version control and editing files directly in production.",
                        "Hardcoding all credentials directly into the source code."
                    ]
                },
                {
                    "id": 3,
                    "question": f"How should {clean_name} evidence be effectively presented on a professional resume to pass recruiter screening?",
                    "options": [
                        f"Write active bullet points describing practical projects, quantifiable metrics (e.g. latency, user volume), and implementation scope.",
                        f"Simply list '{clean_name}' in a keyword cloud without mentioning any project experience.",
                        "Leave out technical tools entirely and only list soft skills.",
                        "Copy job descriptions word-for-word into the resume."
                    ]
                },
                {
                    "id": 4,
                    "question": f"Which verification demonstrates the strongest proof of competence in {clean_name}?",
                    "options": [
                        "An active GitHub repository with an end-to-end working project, clean commit history, and measurable impact.",
                        "Mentioning the skill once in the summary paragraph.",
                        "Claiming 10+ years experience without portfolio links.",
                        "Taking a 5-minute introductory survey."
                    ]
                }
            ],
            "next_topics": [
                {
                    "topic": f"Advanced {clean_name} Architectural Patterns",
                    "description": f"Master design patterns, automated testing suites, and performance optimization in {clean_name}.",
                    "difficulty": "Advanced",
                    "estimated_hours": "10-15 hours"
                },
                {
                    "topic": f"{clean_name} Cloud Integration & CI/CD",
                    "description": f"Deploy {clean_name} applications to cloud infrastructure with automated build and containerization pipelines.",
                    "difficulty": "Intermediate",
                    "estimated_hours": "8-12 hours"
                }
            ]
        }

    def evaluate_assessment(self, skill_name: str, user_answers: Dict[int, int]) -> Dict[str, Any]:
        """
        Evaluate submitted answers, calculate score, determine pass/fail,
        provide detailed question explanations, and unlock next progression steps.
        """
        clean_name = skill_name.strip()
        matched = None
        for key in SKILL_PROGRESSION_MAP:
            if key.lower() == clean_name.lower():
                matched = SKILL_PROGRESSION_MAP[key]
                break

        if not matched:
            # Fallback evaluation (correct index is 0 for all dynamic questions)
            total = 4
            correct = sum(1 for qid in range(1, 5) if user_answers.get(qid) == 0)
            score_percent = round((correct / total) * 100, 1)
            passed = score_percent >= 80

            return {
                "skill_name": clean_name,
                "score_percent": score_percent,
                "correct_count": correct,
                "total_questions": total,
                "passed": passed,
                "message": (
                    f"Congratulations! You passed the {clean_name} verification with {score_percent}%!"
                    if passed else
                    f"You scored {score_percent}%. Review the fundamentals and retake the assessment to unlock verification."
                ),
                "next_topics": [
                    {
                        "topic": f"Advanced {clean_name} Architectural Patterns",
                        "description": f"Master design patterns, automated testing suites, and performance optimization in {clean_name}.",
                        "difficulty": "Advanced",
                        "estimated_hours": "10-15 hours"
                    }
                ],
                "question_results": [
                    {
                        "id": qid,
                        "user_answer": user_answers.get(qid),
                        "correct_answer": 0,
                        "is_correct": user_answers.get(qid) == 0,
                        "explanation": "Professional engineering emphasizes modular code, metrics, and verifiable project evidence."
                    }
                    for qid in range(1, 5)
                ]
            }

        questions = matched["questions"]
        total = len(questions)
        correct_count = 0
        results = []

        for q in questions:
            qid = q["id"]
            user_ans = user_answers.get(qid)
            is_correct = (user_ans == q["correct_index"])
            if is_correct:
                correct_count += 1

            results.append({
                "id": qid,
                "question": q["question"],
                "options": q["options"],
                "user_answer": user_ans,
                "correct_answer": q["correct_index"],
                "is_correct": is_correct,
                "explanation": q["explanation"]
            })

        score_percent = round((correct_count / total) * 100, 1)
        passed = score_percent >= 80

        return {
            "skill_name": clean_name,
            "score_percent": score_percent,
            "correct_count": correct_count,
            "total_questions": total,
            "passed": passed,
            "message": (
                f"Outstanding! You passed the {clean_name} verification assessment with {score_percent}%! You can now mark this skill as verified."
                if passed else
                f"You scored {score_percent}% ({correct_count}/{total} correct). A score of 80% is required to verify. Review the explanations below and try again."
            ),
            "next_topics": matched["next_topics"],
            "question_results": results
        }

assessment_engine = AssessmentEngine()
