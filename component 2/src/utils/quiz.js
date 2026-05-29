export function typeLabel(type) {
  return (
    {
      multiple_choice_question: 'Multiple choice',
      multiple_answers_question: 'Multiple answer',
      true_false_question: 'True or false',
      short_answer_question: 'Fill in the blank',
      essay_question: 'Essay',
    }[type] || 'Question'
  );
}

export function hasAnswer(question, answer) {
  if (question.question_type === 'multiple_answers_question')
    return Array.isArray(answer) && answer.length > 0;
  return answer !== undefined && answer !== null && String(answer).trim() !== '';
}

export function emptyAnswerFor(question) {
  return question.question_type === 'multiple_answers_question' ? [] : '';
}

export function getTypeBreakdown(quiz, gradedResults) {
  const stats = {};
  quiz.questions.forEach((q) => {
    const label = typeLabel(q.question_type);
    if (!stats[label]) stats[label] = { correct: 0, total: 0 };
    stats[label].total++;
    if (gradedResults.questions[q.id]?.is_correct) stats[label].correct++;
  });
  return Object.entries(stats);
}

export function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function buildRandomQuiz(quiz, questionBank) {
  const requiredTypes = [
    'multiple_choice_question',
    'true_false_question',
    'multiple_answers_question',
    'short_answer_question',
    'essay_question',
  ];
  const pool = (questionBank || []).filter((q) => q.quiz_id === quiz.id);
  const selected = requiredTypes
    .map((type) => shuffle(pool.filter((q) => q.question_type === type))[0])
    .filter(Boolean);
  const remaining = shuffle(pool.filter((q) => !selected.some((s) => s.id === q.id)));
  const questions = shuffle([
    ...selected,
    ...remaining.slice(0, Math.max(0, quiz.question_count - selected.length)),
  ]).map((q, index) => ({
    ...q,
    id: `${q.id}-${Date.now()}-${index}`,
    choices: q.choices.map((c) => ({ ...c })),
    correct_choices: [...q.correct_choices],
  }));
  return {
    ...quiz,
    id: `${quiz.id}-${Date.now()}`,
    isLocal: true,
    question_count: questions.length,
    points_possible: questions.reduce((sum, q) => sum + (q.points_possible || 1), 0),
    questions,
  };
}

export function gradeLocalQuiz(quiz, answers) {
  let score = 0;
  const questions = {};
  quiz.questions.forEach((q) => {
    const points = q.points_possible || 1;
    const answer = answers[q.id];
    let isCorrect;
    if (q.question_type === 'multiple_answers_question') {
      isCorrect = arraysEqual((answer || []).sort(), [...q.correct_choices].sort());
    } else if (q.question_type === 'short_answer_question') {
      isCorrect = q.correct_choices.some(
        (c) => String(c).toLowerCase() === String(answer).trim().toLowerCase()
      );
    } else if (q.question_type === 'essay_question') {
      isCorrect = String(answer || '').trim().length >= 30;
    } else {
      isCorrect = q.correct_choices.includes(answer);
    }
    if (isCorrect) score += points;
    questions[q.id] = {
      is_correct: isCorrect,
      correct_choices: q.correct_choices,
      points_earned: isCorrect ? points : 0,
      points_possible: points,
    };
  });
  const maxScore = quiz.questions.reduce((sum, q) => sum + (q.points_possible || 1), 0);
  return {
    score,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100),
    questions,
  };
}
