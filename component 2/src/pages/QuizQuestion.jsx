import { typeLabel } from '../utils/quiz';

export default function QuizQuestion({
  quiz,
  question,
  currentQuestionIdx,
  selectedAnswers,
  submitted,
  isFlagged,
  onAnswerSelect,
  onTextAnswerChange,
  onToggleFlag,
  onPrevious,
  onNext,
  onSubmitClick,
}) {
  const isChoiceQuestion = [
    'multiple_choice_question',
    'true_false_question',
    'multiple_answers_question',
  ].includes(question.question_type);
  const isMultiAnswer = question.question_type === 'multiple_answers_question';
  const isShortAnswer = question.question_type === 'short_answer_question';
  const isEssay = question.question_type === 'essay_question';
  const currentAnswer = selectedAnswers[question.id];
  const isLastQuestion = currentQuestionIdx === quiz.questions.length - 1;
  const progressPct = ((currentQuestionIdx + 1) / quiz.questions.length) * 100;

  return (
    <section className="question-layout">
      <div className="question-toolbar">
        <div>
          <p className="eyebrow">{typeLabel(question.question_type)}</p>
          <h3>
            Question {currentQuestionIdx + 1}{' '}
            <span className="question-of">of {quiz.questions.length}</span>
          </h3>
        </div>
        <div className="toolbar-right">
          {!submitted && (
            <button
              className={`flag-button ${isFlagged ? 'flagged' : ''}`}
              onClick={onToggleFlag}
              title={`${isFlagged ? 'Remove flag' : 'Flag for review'} (F)`}
              aria-pressed={isFlagged}
            >
              <svg
                width="13"
                height="14"
                viewBox="0 0 13 14"
                fill={isFlagged ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="1.5" y1="1" x2="1.5" y2="13" />
                <path d="M1.5 1.5h9L8 5l2.5 3.5H1.5" />
              </svg>
              {isFlagged ? 'Flagged' : 'Flag'}
            </button>
          )}
          <span className="points-pill">
            {question.points_possible || 1}{' '}
            {question.points_possible === 1 ? 'pt' : 'pts'}
          </span>
        </div>
      </div>

      <div className="question-progress-bar">
        <div className="question-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <article className="question-panel">
        <div
          className="question-text"
          dangerouslySetInnerHTML={{ __html: question.question_text }}
        />

        {isChoiceQuestion && (
          <div className="options-list">
            {question.choices.map((choice, idx) => {
              const selected = isMultiAnswer
                ? (currentAnswer || []).includes(choice.id)
                : currentAnswer === choice.id;
              return (
                <button
                  key={choice.id}
                  className={`option-button ${selected ? 'selected' : ''}`}
                  onClick={() => onAnswerSelect(question, choice.id)}
                  disabled={submitted}
                >
                  <span className={isMultiAnswer ? 'checkbox-control' : 'radio-control'} />
                  <span>{choice.choice_text}</span>
                  {!isMultiAnswer && !submitted && (
                    <kbd className="option-key">{idx + 1}</kbd>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {isShortAnswer && (
          <input
            className="answer-input"
            type="text"
            placeholder="Type a short answer"
            value={currentAnswer || ''}
            onChange={(e) => onTextAnswerChange(question.id, e.target.value)}
            disabled={submitted}
          />
        )}

        {isEssay && (
          <textarea
            className="answer-input answer-textarea"
            placeholder="Write your response here…"
            value={currentAnswer || ''}
            onChange={(e) => onTextAnswerChange(question.id, e.target.value)}
            disabled={submitted}
          />
        )}
      </article>

      <div className="footer-actions">
        <button
          className="secondary-button"
          onClick={onPrevious}
          disabled={currentQuestionIdx === 0}
        >
          Previous
        </button>
        {isLastQuestion ? (
          <button className="primary-button" onClick={onSubmitClick}>
            Submit quiz
          </button>
        ) : (
          <button className="primary-button" onClick={onNext}>
            Next
          </button>
        )}
      </div>

      {!submitted && (
        <div className="keyboard-hints" aria-hidden="true">
          <span>
            <kbd>← →</kbd> Navigate
          </span>
          <span>
            <kbd>1–4</kbd> Select answer
          </span>
          <span>
            <kbd>F</kbd> Flag question
          </span>
        </div>
      )}
    </section>
  );
}
