# How I Would Test Each Component

This project has three main components: the data pipeline, the application/AI tutor, and the testing/demo deliverable. I would test each component separately first, then test the full application flow end to end.

## Component 1: Data Pipeline

The goal of Component 1 testing is to confirm that the Canvas QTI export is parsed correctly, database tables are created, quiz data is loaded, and image assets are handled properly.

I would start by installing the root Python requirements:

```bash
pip install -r requirements.txt
```

Then I would verify that `.env` contains valid database credentials:

```env
DB_USER=root
DB_PASSWORD=your_mariadb_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=quiz_bank_db
```

Next, I would create the database in MariaDB:

```sql
CREATE DATABASE quiz_bank_db;
```

Then I would run the importer:

```bash
python3 "component 1/load_data.py"
```

Expected results:

- The script completes without errors.
- The quiz ZIP is parsed successfully.
- The database contains quiz, question, answer choice, and question image rows.
- The two quiz images are copied into `component 1/image_questions/assessment_questions`.

I would validate the database with these SQL checks:

```sql
SELECT COUNT(*) FROM quizzes;
SELECT COUNT(*) FROM questions;
SELECT COUNT(*) FROM answer_choices;
SELECT COUNT(*) FROM question_images;
```

For the provided QTI export, I expect:

- `quizzes`: 1
- `questions`: 8
- `question_images`: 2

I would also run the Component 1 automation script:

```bash
python3 "component 3/test_component_1.py"
```

This confirms the parser works and that the ORM schema can create and insert rows in a test database.

## Component 2: Application And AI Tutor

The goal of Component 2 testing is to confirm that the React app, FastAPI backend (`app.py`), and AI tutor flow work together correctly.

First, I would install frontend dependencies:

```bash
cd "component 2"
npm install
```

Then I would start the Vite development server:

```bash
npm run dev
```

I would open the local Vite URL, usually:

```text
http://localhost:5173
```

Frontend checks:

- The dashboard loads and displays available quizzes.
- Starting a quiz shows questions one at a time.
- Multiple choice questions allow one selected answer.
- Multiple answer questions allow multiple selections.
- True/false questions work correctly.
- Short answer questions accept typed input.
- Essay questions accept longer typed responses.
- Image-based questions display the code images correctly.
- The submit modal appears before final submission.
- The results screen shows score, percentage, and answer review.
- Retaking a quiz resets answers and state.

I would also run a production build:

```bash
npm run build
```

Expected result:

- The build completes successfully.
- A `dist` folder is generated.
- No build errors appear in the terminal.

I would also run the Component 2 automation script:

```bash
python3 "component 3/test_component_2.py"
```

To include the production build in the automated test:

```bash
python3 "component 3/test_component_2.py" --include-build
```

Next, I would test the backend and AI tutor. I would confirm `.env` contains a Groq API key:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

Then I would start the backend from the project root:

```bash
python3 app.py
```

In a separate terminal, I would start the frontend:

```bash
cd "component 2"
npm run dev
```

AI tutor checks:

- Complete and submit a quiz.
- Open the answer review screen.
- Click **Ask AI Tutor** on a reviewed question.
- Confirm the tutor drawer opens.
- Confirm the first explanation references the selected question.
- Ask a follow-up question and confirm the response is relevant.
- Remove or omit `GROQ_API_KEY` and confirm the app shows a clear configuration message instead of crashing.

I would also test the backend endpoint directly:

```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": "test",
    "student_answer": "A",
    "is_correct": true,
    "chat_history": [],
    "message": "Explain this briefly",
    "question_title": "Test question",
    "question_text": "What does print(1 + 1) output?",
    "question_type": "multiple_choice_question",
    "choices": [
      {"id": "A", "choice_text": "2", "is_correct": true}
    ]
  }'
```

Expected result:

- The response is valid JSON.
- The response contains a `response` field.
- If the Groq key is configured, the response contains an AI explanation.
- If the Groq key is missing, the response contains a helpful setup message.

## Component 3: Testing And Demo

The goal of Component 3 is to provide evidence that Components 1 and 2 work correctly. This includes testing documentation, manual checklist items, and any demo verification notes.

I would test Component 3 by checking that the testing document is complete and that it covers:

- Component 1 data import testing.
- Component 2 frontend testing.
- Component 2 backend and AI tutor testing.
- Full end-to-end workflow testing.
- Expected results for each test.
- Failure cases, such as missing database credentials or missing Groq API key.

For a demo, I would verify that the walkthrough can show:

1. Importing/parsing the quiz data.
2. Starting the backend.
3. Starting the React app.
4. Completing a quiz.
5. Viewing results.
6. Opening the AI tutor.
7. Asking a follow-up question.

## End-To-End Test

After testing each component individually, I would run the full flow:

1. Import quiz data with Component 1.
2. Start the backend with `python3 app.py`.
3. Start the frontend with `npm run dev` inside `component 2`.
4. Complete a quiz.
5. Review the score and answer breakdown.
6. Open the AI tutor drawer.
7. Ask a follow-up question.

The full system passes if quiz data loads, questions render correctly, grading works, images display, and the AI tutor responds without errors.
