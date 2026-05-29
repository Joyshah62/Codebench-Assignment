import { ScoreRing } from '../components/ScoreRing';
import { formatTimeTaken } from '../utils/formatting';
import { getTypeBreakdown } from '../utils/quiz';

export default function Dashboard({
  quizzes,
  submitted,
  gradedResults,
  activeQuiz,
  timeTakenSecs,
  attemptHistory,
  onStartQuiz,
  onViewResults,
  onRetake,
}) {
  return (
    <div className="dashboard-content">
      {/* Post-quiz result summary */}
      {submitted && gradedResults && activeQuiz && (
        <div className="result-summary-card">
          <div className="result-summary-main">
            <div className="result-summary-ring">
              <ScoreRing percentage={gradedResults.percentage} />
            </div>
            <div className="result-summary-info">
              <p className="eyebrow">Last attempt</p>
              <h3>{activeQuiz.title}</h3>
              <div className="result-summary-meta">
                <span>
                  {gradedResults.score}/{gradedResults.max_score} pts
                </span>
                <span>{activeQuiz.questions.length} questions</span>
                {timeTakenSecs && <span>{formatTimeTaken(timeTakenSecs)}</span>}
              </div>
              <div className="result-type-breakdown">
                {getTypeBreakdown(activeQuiz, gradedResults).map(([label, stats]) => (
                  <div key={label} className="type-breakdown-item">
                    <span className="type-label">{label}</span>
                    <span
                      className={`type-score ${
                        stats.correct === stats.total
                          ? 'perfect'
                          : stats.correct === 0
                          ? 'zero'
                          : ''
                      }`}
                    >
                      {stats.correct}/{stats.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="result-summary-actions">
            <button className="primary-button" onClick={onViewResults}>
              Review answers
            </button>
            <button className="secondary-button" onClick={onRetake}>
              Retake quiz
            </button>
          </div>
        </div>
      )}

      {/* Quiz list */}
      <section className="content-section">
        <div className="section-header">
          <p className="eyebrow">Available quizzes</p>
        </div>
        <div className="quiz-list">
          {quizzes.map((quiz) => {
            const attempts = attemptHistory.filter((a) => a.quizId === quiz.id);
            const best = attempts.length
              ? Math.max(...attempts.map((a) => a.percentage))
              : null;
            return (
              <article key={quiz.id} className="quiz-card">
                <div>
                  <h4>{quiz.title}</h4>
                  <p>
                    {quiz.question_count || 0} questions
                    <span>Time: {quiz.time_limit_mins || 15} mins</span>
                    <span>Points: {quiz.points_possible || 0}</span>
                    {best !== null && <span>Best: {best}%</span>}
                    {attempts.length > 0 && (
                      <span>
                        {attempts.length} attempt{attempts.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
                <button className="primary-button" onClick={() => onStartQuiz(quiz)}>
                  {attempts.length > 0 ? 'Retake' : 'Start'}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
