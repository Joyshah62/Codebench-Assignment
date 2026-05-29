#!/usr/bin/env python3
from __future__ import annotations

import importlib
import os
import py_compile
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMPONENT_1 = PROJECT_ROOT / "component 1"
EXPECTED_QUIZZES = 1
EXPECTED_QUESTIONS = 8
EXPECTED_IMAGES = 2


def pass_check(message: str) -> None:
    print(f"[PASS] {message}")


def fail_check(message: str) -> None:
    print(f"[FAIL] {message}")
    raise AssertionError(message)


def compile_component_1() -> None:
    for filename in ("load_data.py", "models.py", "parser.py", "database.py"):
        py_compile.compile(str(COMPONENT_1 / filename), doraise=True)
    pass_check("Component 1 Python files compile")


def check_requirements_importable() -> None:
    for module_name in ("dotenv", "sqlalchemy", "pymysql"):
        importlib.import_module(module_name)
    pass_check("Component 1 Python dependencies are importable")


def check_env_shape() -> None:
    load_dotenv(PROJECT_ROOT / ".env")
    required = ("DB_USER", "DB_HOST", "DB_PORT", "DB_NAME")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        fail_check(f"Missing database environment values: {', '.join(missing)}")
    pass_check(".env contains required database settings")


def load_component_1_modules():
    sys.path.insert(0, str(COMPONENT_1))
    load_data = importlib.import_module("load_data")
    database = importlib.import_module("database")
    models = importlib.import_module("models")
    return load_data, database, models


def parse_qti_zip() -> list[dict]:
    load_data, _, _ = load_component_1_modules()
    if not Path(load_data.DEFAULT_ZIP).exists():
        fail_check(f"Missing QTI ZIP: {load_data.DEFAULT_ZIP}")

    quizzes = load_data.parse_canvas_quiz_zip(load_data.DEFAULT_ZIP)
    question_count = sum(len(quiz["questions"]) for quiz in quizzes)
    image_count = sum(len(question["images"]) for quiz in quizzes for question in quiz["questions"])

    if len(quizzes) != EXPECTED_QUIZZES:
        fail_check(f"Expected {EXPECTED_QUIZZES} quiz, found {len(quizzes)}")
    if question_count != EXPECTED_QUESTIONS:
        fail_check(f"Expected {EXPECTED_QUESTIONS} questions, found {question_count}")
    if image_count != EXPECTED_IMAGES:
        fail_check(f"Expected {EXPECTED_IMAGES} question images, found {image_count}")

    pass_check("QTI ZIP parses into expected quiz/question/image counts")
    return quizzes


def check_image_assets() -> None:
    for image_name in ("code.jpg", "code2.jpg"):
        image_path = COMPONENT_1 / "image_questions" / "assessment_questions" / image_name
        if not image_path.exists():
            fail_check(f"Missing copied image asset: {image_path}")
    pass_check("Question image assets exist in Component 1 image_questions folder")


def check_database_mapping(quizzes: list[dict]) -> None:
    _, database, models = load_component_1_modules()

    engine = create_engine("sqlite:///:memory:")
    database.load_quizzes_to_database(engine, quizzes)

    Session = sessionmaker(bind=engine)
    with Session() as session:
        counts = {
            "quizzes": session.query(models.Quiz).count(),
            "questions": session.query(models.Question).count(),
            "answer_choices": session.query(models.AnswerChoice).count(),
            "question_images": session.query(models.QuestionImage).count(),
        }

    if counts["quizzes"] != EXPECTED_QUIZZES:
        fail_check(f"Expected {EXPECTED_QUIZZES} quiz row, found {counts['quizzes']}")
    if counts["questions"] != EXPECTED_QUESTIONS:
        fail_check(f"Expected {EXPECTED_QUESTIONS} question rows, found {counts['questions']}")
    if counts["answer_choices"] <= 0:
        fail_check("Expected answer choice rows")
    if counts["question_images"] != EXPECTED_IMAGES:
        fail_check(f"Expected {EXPECTED_IMAGES} question image rows, found {counts['question_images']}")

    pass_check("ORM schema creates expected rows in an isolated test database")


def main() -> int:
    try:
        compile_component_1()
        check_requirements_importable()
        check_env_shape()
        quizzes = parse_qti_zip()
        check_image_assets()
        check_database_mapping(quizzes)
    except Exception as exc:
        print(f"\nComponent 1 tests failed: {exc}")
        return 1

    print("\nComponent 1 tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
