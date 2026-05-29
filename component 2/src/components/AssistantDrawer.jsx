import { renderMessage } from '../utils/markdown';
import { typeLabel } from '../utils/quiz';

const SUGGESTIONS = [
  { label: 'Why correct?', message: 'Why is this the correct answer? Explain the key concept.' },
  {
    label: 'Explain simply',
    message: 'Explain this as simply as possible, like I have no background.',
  },
  {
    label: 'Practice question',
    message: 'Give me a similar question I can try to practice this concept.',
  },
  {
    label: 'Common mistakes',
    message: 'What are common mistakes students make on questions like this?',
  },
];

export function AssistantDrawer({
  isOpen,
  question,
  gradedResults,
  selectedAnswers,
  chatHistory,
  chatInput,
  chatLoading,
  chatEndRef,
  onClose,
  onChatInput,
  onSend,
}) {
  const gradeDetail = question && gradedResults ? gradedResults.questions[question.id] : null;
  const showSuggestions = !chatLoading && chatHistory.length === 0;

  return (
    <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <aside
        className="assistant-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="AI assistant"
      >
        <header className="drawer-header">
          <div className="drawer-header-info">
            <div className="drawer-ai-badge">AI Tutor</div>
            <h3>{question ? typeLabel(question.question_type) : 'Discussion'}</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close assistant">
            <span aria-hidden="true" />
          </button>
        </header>

        <div className="drawer-question">
          {question && (
            <>
              <div
                className="question-text compact"
                dangerouslySetInnerHTML={{ __html: question.question_text }}
              />
              {gradeDetail && (
                <div className="drawer-answer-context">
                  <span
                    className={`answer-status-badge ${gradeDetail.is_correct ? 'correct' : 'incorrect'}`}
                  >
                    {gradeDetail.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                  <span className="drawer-points">
                    {gradeDetail.points_earned}/{gradeDetail.points_possible} pt
                    {gradeDetail.points_possible !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="chat-body">
          {chatHistory.length === 0 && !chatLoading && (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">AI</div>
              <p>
                Ask me anything about this question — I can explain the answer, give you practice
                questions, or explore edge cases with you.
              </p>
            </div>
          )}

          {chatHistory.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-bubble-row ${message.role}`}>
              {message.role === 'assistant' && <div className="chat-avatar">AI</div>}
              <div className={`chat-message ${message.role}`}>
                {message.role === 'assistant'
                  ? renderMessage(message.content)
                  : message.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="chat-bubble-row assistant">
              <div className="chat-avatar">AI</div>
              <div className="chat-message assistant typing-indicator-message">
                <div className="typing-dots">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="chat-composer">
          {showSuggestions && (
            <div className="quick-actions">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => onSend(s.message)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
          >
            <input
              value={chatInput}
              onChange={(e) => onChatInput(e.target.value)}
              placeholder="Ask a follow-up…"
              disabled={chatLoading}
            />
            <button
              type="submit"
              className="primary-button send-button"
              disabled={chatLoading || !chatInput.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
