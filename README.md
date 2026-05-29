# Codebench Assignment

- **Component 1: Data Pipeline**: parses a Canvas QTI quiz export ZIP and loads quiz data into MariaDB with SQLAlchemy.
- **Component 2: Application & AI Tutor**: includes the React/Vite quiz app in `component 2`, the FastAPI backend in `app.py`, and the Groq-powered AI tutor flow.
- **Component 3: Testing & Demo**: contains testing documentation and automation scripts.

## Prerequisites
Install these before running the project:

- Python 3.8+
- Node.js and npm
- MariaDB
- A Groq API key for the AI tutor

## Root Setup
From the project root, install Python dependencies first:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
DB_USER=root
DB_PASSWORD=your_mariadb_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=quiz_bank_db
GROQ_API_KEY=gsk_your_groq_api_key_here
```

## Component 1: Data Pipeline
Create the database:

```sql
CREATE DATABASE quiz_bank_db;
```

Run the importer:

```bash
python3 "component 1/load_data.py"
```

What this does:

- Reads `2026sp-data-management-for-data-science-quiz-export (1).zip`.
- Parses the Canvas QTI XML.
- Creates/updates MariaDB tables for quizzes, questions, choices, and question images.
- Loads quiz data into the database.
- Copies image-question assets into `component 1/image_questions`.

Files:

- `component 1/load_data.py`: entrypoint script
- `component 1/parser.py`: QTI/XML parser
- `component 1/models.py`: SQLAlchemy schema
- `component 1/database.py`: database connection and loading logic

Table design:

- `quizzes`: stores quiz-level information such as title, description, total points, and allowed attempts.
- `questions`: stores each question, its type, point value, HTML question text, and the quiz it belongs to.
- `answer_choices`: stores the answer options for each question and whether each option is correct.
- `question_images`: stores metadata for images used inside questions, including the original Canvas image path, the local copied file path, and alt text.

Relationships:

- One quiz has many questions.
- One question has many answer choices.
- One question can have many images.

Important design choice: `answer_choices` uses a composite primary key of `(id, question_id)` because Canvas/QTI exports can reuse the same answer choice IDs across different questions. This keeps answer options unique per question without losing the original Canvas IDs.

## Component 2: React App
Install frontend dependencies:

```bash
cd "component 2"
npm install
```

Start the React/Vite frontend:

```bash
npm run dev
```

In a second terminal, start the FastAPI backend from the project root:

```bash
python3 app.py
```

Open the Vite URL shown in the frontend terminal, usually:

```text
http://localhost:5173
```

What Component 2 includes:

- Quiz dashboard and quiz-taking interface.
- Local grading and results review.
- AI tutor drawer for reviewed questions.
- `app.py` backend endpoint for secure Groq API calls.

## Component 3: Testing & Demo
Testing materials are in `component 3`.

Run Component 1 automated checks:

```bash
python3 "component 3/test_component_1.py"
```

Run Component 2 automated checks:

```bash
python3 "component 3/test_component_2.py"
```

Optionally include the React production build check:

```bash
python3 "component 3/test_component_2.py" --include-build
```

Testing documentation:

- `component 3/Test.md`: describes how each component should be tested.
- `component 3/test_component_1.py`: automated checks for the data pipeline.
- `component 3/test_component_2.py`: automated checks for the app/backend.

## Assumptions
- The provided Canvas export ZIP is available at the project root.
- The Canvas export follows QTI-style XML and includes `imsmanifest.xml`.
- The provided quiz export is expected to contain 1 quiz, 8 questions, and 2 image-based questions.
- MariaDB/MySQL is running locally or is reachable through the `.env` database settings.
- React question practice data is loaded from `component 2/public/questions.json`.
- Groq credentials are kept server-side in `.env`; the React app never directly sees the API key.
- If `GROQ_API_KEY` is missing, the AI tutor returns a helpful setup message instead of crashing.

## Notes On Design Choices
- I kept Component 1 separate from the app so the data pipeline can be run independently.
- I stored image files on disk and image metadata in the database rather than storing raw image bytes in MariaDB.
- I used a composite primary key for answer choices because QTI exports can reuse answer IDs across different questions.
- I kept the AI call in `app.py` so frontend code does not expose API credentials.
- I added automation scripts that can verify most behavior without requiring a real database write or Groq network call.

## What I Would Improve With More Time
- Add topic-level performance tracking so the app can identify which concepts a student is consistently missing, so let's say if they are solving a dbms foundations quiz then topics such as indexing, transactions, SQL joins.
- Tag each question with one or more topics, then aggregate results by topic after each attempt instead of showing only an overall score.
- Show a personalized weakness summary on the results page, for example: "You missed 3 of 4 questions related to transaction isolation."
- Have the AI tutor generate targeted study suggestions for weak topics, including short explanations, follow-up practice questions, and recommended concepts to review next.
- Track improvement over multiple attempts so students can see whether their weak topics are improving over time.
