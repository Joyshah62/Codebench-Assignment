import { useEffect } from 'react';

export function SubmitModal({ quiz, answeredCount, flaggedCount, onConfirm, onCancel }) {
  const total = quiz.questions.length;
  const unanswered = total - answeredCount;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-wrap">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="14" cy="14" r="12" />
            <line x1="14" y1="9" x2="14" y2="15" />
            <circle cx="14" cy="19" r="1" fill="var(--primary)" stroke="none" />
          </svg>
        </div>

        <h3 id="modal-title">Ready to submit?</h3>
        <p className="modal-subtitle">You won't be able to change answers after submitting.</p>

        <div className="modal-stats">
          <div className="modal-stat">
            <strong>{answeredCount}</strong>
            <span>Answered</span>
          </div>
          <div className={`modal-stat ${flaggedCount > 0 ? 'flagged-stat' : ''}`}>
            <strong>{flaggedCount}</strong>
            <span>Flagged</span>
          </div>
          <div className={`modal-stat ${unanswered > 0 ? 'warn-stat' : ''}`}>
            <strong>{unanswered}</strong>
            <span>Unanswered</span>
          </div>
        </div>

        {(unanswered > 0 || flaggedCount > 0) && (
          <div className="modal-warnings">
            {unanswered > 0 && (
              <p>
                {unanswered} question{unanswered > 1 ? 's' : ''} left unanswered.
              </p>
            )}
            {flaggedCount > 0 && (
              <p>
                {flaggedCount} question{flaggedCount > 1 ? 's' : ''} still flagged for review.
              </p>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel}>
            Go back
          </button>
          <button className="primary-button" onClick={onConfirm}>
            Yes, submit
          </button>
        </div>
      </div>
    </div>
  );
}
