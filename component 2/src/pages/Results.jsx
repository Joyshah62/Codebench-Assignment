import { ScoreRing } from '../components/ScoreRing';
import { GradedAnswer } from '../components/GradedAnswer';
import { typeLabel } from '../utils/quiz';
import { formatTimeTaken } from '../utils/formatting';

export default function Results({
  quiz,
  gradedResults,
  selectedAnswers,
  timeTakenSecs,
  filter,
  onFilterChange,
  onDiscuss,
  onRetake,
}) {
  const correctCount = Object.values(gradedResults.questions).filter((q) => q.is_correct).length;
  const incorrectCount = quiz.questions.length - correctCount;

  const filteredQuestions = quiz.questions.filter((q) => {
    const detail = gradedResults.questions[q.id];
    if (filter === 'correct') return detail?.is_correct;
    if (filter === 'incorrect') return !detail?.is_correct;
    return true;
  });

  const feedbackLabel =
    gradedResults.percentage >= 80
      ? 'Great work!'
      : gradedResults.percentage >= 60
      ? 'Good effort!'
      : 'Keep practicing!';

  return (
    <section className="results-layout">
      {/* Score summary card */}
      <div className="score-panel">
        <div className="score-panel-main">
          <ScoreRing percentage={gradedResults.percentage} />
          <div className="score-panel-info">
            <p className="eyebrow">Results</p>
            <h3>{feedbackLabel}</h3>
            <p className="score-detail">
              {gradedResults.score} of {gradedResults.max_score} points earned
            </p>
            {timeTakenSecs && (
              <p className="score-time">Completed in {formatTimeTaken(timeTakenSecs)}</p>
            )}
          </div>
        </div>
        <div className="score-summary">
          <div>
            <strong>{quiz.questions.length}</strong>
            <span>Total</span>
          </div>
          <div className="correct-stat">
            <strong>{correctCount}</strong>
            <span>Correct</span>
          </div>
          <div className="incorrect-stat">
            <strong>{incorrectCount}</strong>
            <span>Review</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="results-actions-bar">
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => onFilterChange('all')}
          >
            All ({quiz.questions.length})
          </button>
          <button
            className={filter === 'correct' ? 'active' : ''}
            onClick={() => onFilterChange('correct')}
          >
            Correct ({correctCount})
          </button>
          <button
            className={filter === 'incorrect' ? 'active' : ''}
            onClick={() => onFilterChange('incorrect')}
          >
            Needs review ({incorrectCount})
          </button>
        </div>
        <button className="secondary-button" onClick={onRetake}>
          Retake quiz
        </button>
      </div>

      {/* Question review list */}
      <div className="review-list">
        {filteredQuestions.map((question) => {
          const originalIndex = quiz.questions.indexOf(question);
          const gradeDetail = gradedResults.questions[question.id] || {
            is_correct: false,
            correct_choices: [],
          };
          return (
            <article key={question.id} className="review-card">
              <div className="review-header">
                <div>
                  <p className="eyebrow">{typeLabel(question.question_type)}</p>
                  <h4>Question {originalIndex + 1}</h4>
                </div>
                <div className="review-actions">
                  {gradeDetail.ai_graded && (
                    <span className="ai-graded-badge">AI graded</span>
                  )}
                  <span
                    className={`status-pill ${gradeDetail.is_correct ? 'correct' : 'incorrect'}`}
                  >
                    {gradeDetail.is_correct ? 'Correct' : 'Needs review'}
                  </span>
                  <button className="discuss-button" onClick={() => onDiscuss(question)}>
                    Discuss with AI
                  </button>
                </div>
              </div>
              <div
                className="question-text compact"
                dangerouslySetInnerHTML={{ __html: question.question_text }}
              />
              <GradedAnswer
                question={question}
                gradeDetail={gradeDetail}
                studentAnswer={selectedAnswers[question.id]}
              />
            </article>
          );
        })}

        {filteredQuestions.length === 0 && (
          <div className="empty-filter-state">
            <p>No questions match this filter.</p>
          </div>
        )}
      </div>
    </section>
  );
}
