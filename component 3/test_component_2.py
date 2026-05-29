#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib
import json
import os
import py_compile
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMPONENT_2 = PROJECT_ROOT / "component 2"
QUESTION_TYPES = {
    "multiple_choice_question",
    "multiple_answers_question",
    "true_false_question",
    "short_answer_question",
    "essay_question",
}


def pass_check(message: str) -> None:
    print(f"[PASS] {message}")


def fail_check(message: str) -> None:
    print(f"[FAIL] {message}")
    raise AssertionError(message)


def compile_backend() -> None:
    py_compile.compile(str(PROJECT_ROOT / "app.py"), doraise=True)
    pass_check("FastAPI backend file compiles")


def check_frontend_project_files() -> None:
    package_path = COMPONENT_2 / "package.json"
    if not package_path.exists():
        fail_check("Missing component 2/package.json")

    with package_path.open() as file:
        package = json.load(file)

    scripts = package.get("scripts", {})
    dependencies = package.get("dependencies", {})
    dev_dependencies = package.get("devDependencies", {})

    for script in ("dev", "build"):
        if script not in scripts:
            fail_check(f"package.json missing npm script: {script}")
    for dependency in ("react", "react-dom"):
        if dependency not in dependencies:
            fail_check(f"package.json missing dependency: {dependency}")
    if "vite" not in dev_dependencies:
        fail_check("package.json missing Vite dev dependency")

    pass_check("Component 2 package.json has required scripts and dependencies")


def check_question_bank() -> None:
    questions_path = COMPONENT_2 / "public" / "questions.json"
    if not questions_path.exists():
        fail_check("Missing component 2/public/questions.json")

    with questions_path.open() as file:
        data = json.load(file)

    quizzes = data.get("quizzes", [])
    questions = data.get("questions", [])
    if not quizzes:
        fail_check("questions.json must contain at least one quiz")
    if not questions:
        fail_check("questions.json must contain at least one question")

    quiz_ids = {quiz["id"] for quiz in quizzes}
    found_types = {question.get("question_type") for question in questions}
    missing_types = QUESTION_TYPES - found_types
    if missing_types:
        fail_check(f"questions.json missing question types: {sorted(missing_types)}")

    required_question_fields = {
        "id",
        "quiz_id",
        "question_type",
        "question_text",
        "points_possible",
        "choices",
        "correct_choices",
    }
    for question in questions:
        missing = required_question_fields - question.keys()
        if missing:
            fail_check(f"Question {question.get('id')} missing fields: {sorted(missing)}")
        if question["quiz_id"] not in quiz_ids:
            fail_check(f"Question {question['id']} references unknown quiz_id {question['quiz_id']}")
        if not isinstance(question["choices"], list):
            fail_check(f"Question {question['id']} choices must be a list")
        if not isinstance(question["correct_choices"], list):
            fail_check(f"Question {question['id']} correct_choices must be a list")

    pass_check("Component 2 question bank has valid quiz/question structure")


def check_backend_chat_fallback() -> None:
    sys.path.insert(0, str(PROJECT_ROOT))
    app_module = importlib.import_module("app")

    previous_key = os.environ.get("GROQ_API_KEY")
    os.environ["GROQ_API_KEY"] = ""
    try:
        request = app_module.ChatRequest(
            question_id="test-question",
            student_answer="A",
            is_correct=True,
            chat_history=[],
            message="Explain this briefly",
            question_title="Test question",
            question_text="What does print(1 + 1) output?",
            question_type="multiple_choice_question",
            choices=[
                app_module.ChatChoiceContext(
                    id="A",
                    choice_text="2",
                    is_correct=True,
                )
            ],
        )
        response = app_module.chat_with_ai(request)
    finally:
        if previous_key is None:
            os.environ.pop("GROQ_API_KEY", None)
        else:
            os.environ["GROQ_API_KEY"] = previous_key

    if not isinstance(response, dict) or "response" not in response:
        fail_check("Chat fallback must return JSON-like dict with response field")
    if "Groq API Key missing" not in response["response"]:
        fail_check("Chat fallback should explain that Groq API key is missing")

    pass_check("Backend AI tutor fallback works without a Groq network call")


def run_frontend_build() -> None:
    subprocess.run(["npm", "run", "build"], cwd=COMPONENT_2, check=True)
    if not (COMPONENT_2 / "dist").exists():
        fail_check("npm build completed but dist folder was not created")
    pass_check("Component 2 production build succeeds")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run automated tests for Component 2")
    parser.add_argument(
        "--include-build",
        action="store_true",
        help="Also run npm run build",
    )
    args = parser.parse_args()

    try:
        compile_backend()
        check_frontend_project_files()
        check_question_bank()
        check_backend_chat_fallback()
        if args.include_build:
            run_frontend_build()
    except Exception as exc:
        print(f"\nComponent 2 tests failed: {exc}")
        return 1

    print("\nComponent 2 tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
