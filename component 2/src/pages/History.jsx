import { Sparkline } from '../components/Sparkline';
import { formatTimeTaken, formatAttemptDate } from '../utils/formatting';

export default function History({ quizzes, attemptHistory }) {
  if (attemptHistory.length === 0) {
    return (
      <div className="history-content">
        <div className="empty-history-state">
          <div className="empty-history-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3>No attempts yet</h3>
          <p>Head to the dashboard, start a quiz, and your results will be tracked here over time.</p>
        </div>
      </div>
    );
  }

  const totalAttempts = attemptHistory.length;
  const uniqueQuizzes = new Set(attemptHistory.map((a) => a.quizId)).size;
  const overallBest = Math.max(...attemptHistory.map((a) => a.percentage));

  return (
    <div className="history-content">
      <div className="history-stats-row">
        <div className="history-stat-card">
          <strong>{totalAttempts}</strong>
          <span>Total attempts</span>
        </div>
        <div className="history-stat-card">
          <strong>{uniqueQuizzes}</strong>
          <span>Quizzes practiced</span>
        </div>
        <div className="history-stat-card">
          <strong
            className={
              overallBest >= 80
                ? 'stat-high'
                : overallBest >= 60
                ? 'stat-mid'
                : 'stat-low'
            }
          >
            {overallBest}%
          </strong>
          <span>Personal best</span>
        </div>
      </div>

      <section className="content-section">
        <div className="section-header">
          <p className="eyebrow">All attempts</p>
        </div>
        {quizzes.map((quiz) => {
          const attempts = attemptHistory.filter((a) => a.quizId === quiz.id);
          if (!attempts.length) return null;
          const best = Math.max(...attempts.map((a) => a.percentage));
          const sparkData = [...attempts].reverse().map((a) => a.percentage);
          return (
            <div key={quiz.id} className="history-quiz-group">
              <div className="history-quiz-header">
                <span className="history-quiz-title">{quiz.title}</span>
                <div className="history-quiz-meta">
                  <span className="history-best">Best {best}%</span>
                  <Sparkline data={sparkData} />
                </div>
              </div>
              <div className="history-rows">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="history-row">
                    <span className="history-date">{formatAttemptDate(attempt.date)}</span>
                    <div className="history-row-right">
                      {attempt.timeTaken && (
                        <span className="history-time">
                          {formatTimeTaken(attempt.timeTaken)}
                        </span>
                      )}
                      <span
                        className={`history-score ${
                          attempt.percentage >= 80
                            ? 'high'
                            : attempt.percentage >= 60
                            ? 'mid'
                            : 'low'
                        }`}
                      >
                        {attempt.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
