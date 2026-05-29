import { typeLabel } from './quiz';

export function sanitizeAssistantContent(content) {
  return String(content || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/️/g, '')
    .replace(/LlamaTutor|Llama 3\.2|Llama/gi, 'AI assistant')
    .trim();
}

export function isAssistantServiceMessage(content) {
  const n = content.toLowerCase();
  return n.includes('api key') || n.includes('.env') || n.includes('groq');
}

export function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export function buildChatPayload(question, gradeDetail, studentAnswer, chatHistory, message) {
  return {
    question_id: question.id,
    student_answer: studentAnswer,
    is_correct: gradeDetail.is_correct,
    chat_history: chatHistory,
    message,
    question_title: typeLabel(question.question_type),
    question_type: question.question_type,
    question_text: htmlToPlainText(question.question_text),
    choices: question.choices.map((c) => ({
      id: c.id,
      choice_text: c.choice_text,
      is_correct: (gradeDetail.correct_choices || question.correct_choices || []).includes(c.id),
    })),
  };
}

export function buildEssayGradingPayload(question, studentAnswer) {
  const maxPts = question.points_possible || 1;
  return {
    question_id: question.id,
    student_answer: studentAnswer,
    is_correct: false,
    chat_history: [],
    question_title: 'Essay',
    question_type: 'essay_question',
    question_text: htmlToPlainText(question.question_text),
    choices: [],
    message: `Grade this student essay. Question: "${htmlToPlainText(question.question_text)}". Answer: "${studentAnswer}". Award 0–${maxPts} point(s). Reply in EXACTLY this format:\nSCORE: [number]\n[One sentence of feedback]`,
  };
}
