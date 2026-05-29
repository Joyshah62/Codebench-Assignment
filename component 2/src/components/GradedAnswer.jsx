export function GradedAnswer({ question, gradeDetail, studentAnswer }) {
  const isChoiceQuestion = [
    'multiple_choice_question',
    'true_false_question',
    'multiple_answers_question',
  ].includes(question.question_type);
  const isMultiAnswer = question.question_type === 'multiple_answers_question';

  if (isChoiceQuestion) {
    return (
      <div className="options-list review-options">
        {question.choices.map((choice) => {
          const selected = isMultiAnswer
            ? (studentAnswer || []).includes(choice.id)
            : studentAnswer === choice.id;
          const correct = (gradeDetail.correct_choices || []).includes(choice.id);
          return (
            <div
              key={choice.id}
              className={`option-button graded ${selected ? 'selected' : ''} ${
                correct ? 'correct-choice' : ''
              }`}
            >
              <span className={isMultiAnswer ? 'checkbox-control' : 'radio-control'} />
              <span>{choice.choice_text}</span>
              {selected && !correct && (
                <strong className="answer-tag your-tag">Your answer</strong>
              )}
              {correct && <strong className="answer-tag correct-tag">Correct</strong>}
            </div>
          );
        })}
      </div>
    );
  }

  if (question.question_type === 'short_answer_question') {
    return (
      <div className="text-review">
        <p>
          <strong>Your answer:</strong> {studentAnswer || 'No answer submitted'}
        </p>
        {!gradeDetail.is_correct && (
          <p>
            <strong>Accepted answer:</strong>{' '}
            {question.choices.map((c) => c.choice_text).join(', ')}
          </p>
        )}
      </div>
    );
  }

  // Essay
  return (
    <div className="text-review">
      <p>
        <strong>Your response:</strong>
      </p>
      <p className="essay-response-text">{studentAnswer || 'No response submitted'}</p>

      {gradeDetail.ai_grading && (
        <div className="ai-grading-row">
          <div className="typing-dots">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
          <span>AI is grading this response…</span>
        </div>
      )}

      {gradeDetail.ai_graded && (
        <div className="ai-essay-result">
          <div className="ai-essay-score">
            <span className="eyebrow">AI Grade</span>
            <strong>
              {gradeDetail.points_earned}/{gradeDetail.points_possible} pt
              {gradeDetail.points_possible !== 1 ? 's' : ''}
            </strong>
          </div>
          {gradeDetail.ai_feedback && (
            <p className="ai-essay-feedback">{gradeDetail.ai_feedback}</p>
          )}
        </div>
      )}
    </div>
  );
}
