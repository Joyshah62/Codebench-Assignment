from __future__ import annotations

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    points_possible: Mapped[float | None] = mapped_column(Float, nullable=True)
    allowed_attempts: Mapped[int | None] = mapped_column(Integer, nullable=True)

    questions: Mapped[list["Question"]] = relationship(
        "Question",
        back_populates="quiz",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Quiz(id={self.id}, title={self.title!r}, points={self.points_possible})>"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    quiz_id: Mapped[str] = mapped_column(String(255), ForeignKey("quizzes.id"))
    title: Mapped[str] = mapped_column(String(255))
    question_type: Mapped[str] = mapped_column(String(50))
    points_possible: Mapped[float | None] = mapped_column(Float, nullable=True)
    question_text: Mapped[str] = mapped_column(Text)

    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="questions")
    choices: Mapped[list["AnswerChoice"]] = relationship(
        "AnswerChoice",
        back_populates="question",
        cascade="all, delete-orphan",
    )
    images: Mapped[list["QuestionImage"]] = relationship(
        "QuestionImage",
        back_populates="question",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Question(id={self.id}, title={self.title!r}, type={self.question_type!r})>"


class AnswerChoice(Base):
    __tablename__ = "answer_choices"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    question_id: Mapped[str] = mapped_column(String(255), ForeignKey("questions.id"), primary_key=True)
    choice_text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean)

    question: Mapped["Question"] = relationship("Question", back_populates="choices")

    def __repr__(self) -> str:
        preview = self.choice_text[:20]
        return f"<AnswerChoice(id={self.id}, text={preview!r}..., correct={self.is_correct})>"


class QuestionImage(Base):
    __tablename__ = "question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[str] = mapped_column(String(255), ForeignKey("questions.id"))
    original_src: Mapped[str] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(Text)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)

    question: Mapped["Question"] = relationship("Question", back_populates="images")

    def __repr__(self) -> str:
        return f"<QuestionImage(question_id={self.question_id}, file_path={self.file_path!r})>"
