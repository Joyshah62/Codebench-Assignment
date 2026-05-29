from __future__ import annotations

import argparse
import os
import sys
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

from models import AnswerChoice, Base, Question, QuestionImage, Quiz


def build_database_url(db_url: str | None = None) -> str | None:
    if db_url or os.getenv("DATABASE_URL"):
        return db_url or os.getenv("DATABASE_URL")

    user = os.getenv("DB_USER")
    db_name = os.getenv("DB_NAME")
    if not user or not db_name:
        return None

    password = os.getenv("DB_PASSWORD", "")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{db_name}"


def _masked_url(db_url: str) -> str:
    if "://" not in db_url or "@" not in db_url:
        return db_url

    scheme, rest = db_url.split("://", 1)
    credentials, host = rest.split("@", 1)
    user = credentials.split(":", 1)[0]
    return f"{scheme}://{user}:*****@{host}"


def get_database_engine(args: argparse.Namespace) -> Engine:
    db_url = build_database_url(args.db_url)
    if not db_url:
        raise SystemExit(
            "[!] Error: No database configuration provided.\n"
            "    Use --db-url, DATABASE_URL, or DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME."
        )

    print("[*] Connecting to database...")
    print(f"    Database URL: {_masked_url(db_url)}")

    try:
        engine = create_engine(db_url, echo=False)
        with engine.connect():
            pass
    except Exception as exc:
        print(f"[-] Database connection failed: {exc}", file=sys.stderr)
        raise SystemExit("Please make sure MariaDB is running and your credentials are correct.") from exc

    print("[+] Database connection verified successfully.")
    return engine


def _make_quiz(data: dict[str, Any]) -> Quiz:
    return Quiz(
        id=data["id"],
        title=data["title"],
        description=data["description"],
        points_possible=data["points_possible"],
        allowed_attempts=data["allowed_attempts"],
        questions=[
            Question(
                id=question["id"],
                title=question["title"],
                question_type=question["question_type"],
                points_possible=question["points_possible"],
                question_text=question["question_text"],
                choices=[
                    AnswerChoice(
                        id=choice["id"],
                        choice_text=choice["text"],
                        is_correct=choice["is_correct"],
                    )
                    for choice in question["choices"]
                ],
                images=[
                    QuestionImage(
                        original_src=image["original_src"],
                        file_path=image["file_path"],
                        alt_text=image["alt_text"],
                    )
                    for image in question["images"]
                ],
            )
            for question in data["questions"]
        ],
    )


def load_quizzes_to_database(engine: Engine, quizzes_data: list[dict[str, Any]]) -> None:
    print("[*] Creating database tables if they do not exist...")
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    with Session() as session:
        try:
            for quiz_data in quizzes_data:
                existing_quiz = session.get(Quiz, quiz_data["id"])
                if existing_quiz:
                    print(f"[*] Replacing existing quiz: {quiz_data['title']!r}")
                    session.delete(existing_quiz)
                    session.flush()

                quiz = _make_quiz(quiz_data)
                session.add(quiz)
                print(f"[+] Loaded quiz: {quiz.title!r} with {len(quiz.questions)} questions.")

            session.commit()
        except Exception:
            session.rollback()
            raise

    print("[+] Transaction committed successfully. Canvas quiz import complete!")
