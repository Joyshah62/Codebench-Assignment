#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from dotenv import load_dotenv

from database import build_database_url, get_database_engine, load_quizzes_to_database
from models import AnswerChoice, Base, Question, QuestionImage, Quiz
from parser import parse_canvas_quiz_zip, parse_quiz_qti_and_meta


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ZIP = PROJECT_ROOT / "2026sp-data-management-for-data-science-quiz-export (1).zip"
load_dotenv(PROJECT_ROOT / ".env")

__all__ = [
    "AnswerChoice",
    "Base",
    "Question",
    "QuestionImage",
    "Quiz",
    "build_database_url",
    "get_database_engine",
    "load_quizzes_to_database",
    "parse_canvas_quiz_zip",
    "parse_quiz_qti_and_meta",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Canvas QTI quiz ZIP parser and MariaDB loader")
    parser.add_argument(
        "zip_file",
        nargs="?",
        default=DEFAULT_ZIP,
        help=f"Path to the Canvas export ZIP file (default: {DEFAULT_ZIP})",
    )
    parser.add_argument(
        "--db-url",
        help="Full database connection URL, e.g. mysql+pymysql://user:password@localhost:3306/dbname",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    quizzes = parse_canvas_quiz_zip(args.zip_file)
    if not quizzes:
        raise SystemExit("[-] No quizzes parsed. Exiting.")

    load_quizzes_to_database(get_database_engine(args), quizzes)


if __name__ == "__main__":
    main()
