import { useEffect } from 'react';

export function LeaveQuizModal({ answeredCount, totalCount, onConfirm, onCancel }) {
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
      aria-labelledby="leave-modal-title"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-wrap">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 5H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
            <polyline points="17 9 22 4 17 4" />
            <line x1="22" y1="4" x2="12" y2="14" />
          </svg>
        </div>

        <h3 id="leave-modal-title">Leave this quiz?</h3>
        <p className="modal-subtitle">
          Your progress will be lost and the quiz will end. This cannot be undone.
        </p>

        <div className="modal-stats">
          <div className="modal-stat">
            <strong>{totalCount}</strong>
            <span>Total</span>
          </div>
          <div className="modal-stat">
            <strong style={{ color: 'var(--primary)' }}>{answeredCount}</strong>
            <span>Answered</span>
          </div>
          <div className={`modal-stat ${answeredCount < totalCount ? 'warn-stat' : ''}`}>
            <strong>{totalCount - answeredCount}</strong>
            <span>Remaining</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel}>
            Keep going
          </button>
          <button className="leave-button" onClick={onConfirm}>
            Leave quiz
          </button>
        </div>
      </div>
    </div>
  );
}
