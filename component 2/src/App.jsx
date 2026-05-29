import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import { API_BASE } from './constants';
import { loadAttemptHistory, saveAttemptHistory } from './utils/history';
import {
  buildRandomQuiz,
  gradeLocalQuiz,
  hasAnswer,
  emptyAnswerFor,
  typeLabel,
} from './utils/quiz';
import {
  sanitizeAssistantContent,
  isAssistantServiceMessage,
  buildChatPayload,
  buildEssayGradingPayload,
} from './utils/ai';
import { formatTime } from './utils/formatting';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import { LoadingState } from './components/LoadingState';
import { SubmitModal } from './components/SubmitModal';
import { LeaveQuizModal } from './components/LeaveQuizModal';
import { AssistantDrawer } from './components/AssistantDrawer';

import Dashboard from './pages/Dashboard';
import History from './pages/History';
import QuizQuestion from './pages/QuizQuestion';
import Results from './pages/Results';

export default function App() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [quizzes, setQuizzes] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);

  // ── Active quiz ───────────────────────────────────────────────────────────
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuizConfig, setCurrentQuizConfig] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [gradedResults, setGradedResults] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading quiz workspace');
  const [error, setError] = useState('');
  const [pendingNavView, setPendingNavView] = useState(null);

  // ── Timer / timing ────────────────────────────────────────────────────────
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [timeTakenSecs, setTimeTakenSecs] = useState(null);

  // ── Features ──────────────────────────────────────────────────────────────
  const [flaggedSet, setFlaggedSet] = useState(() => new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [resultsFilter, setResultsFilter] = useState('all');
  const [attemptHistory, setAttemptHistory] = useState(() => loadAttemptHistory());

  // ── AI drawer ─────────────────────────────────────────────────────────────
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [activeAiQuestion, setActiveAiQuestion] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeQuestion = activeQuiz?.questions?.[currentQuestionIdx];

  const answeredCount = useMemo(() => {
    if (!activeQuiz) return 0;
    return activeQuiz.questions.filter((q) => hasAnswer(q, selectedAnswers[q.id])).length;
  }, [activeQuiz, selectedAnswers]);

  const flaggedCount = useMemo(() => {
    if (!activeQuiz) return 0;
    return activeQuiz.questions.filter((q) => flaggedSet.has(q.id)).length;
  }, [activeQuiz, flaggedSet]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/questions.json')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.quizzes) setQuizzes(data.quizzes);
        if (data.questions) setQuestionBank(data.questions);
      })
      .catch(() => setError('Failed to load the question bank. Please try again later.'));
  }, []);

  useEffect(() => {
    if (view !== 'questions' || submitted || timeRemaining === null) return;
    if (timeRemaining <= 0) { doSubmit(); return; }
    const t = setTimeout(() => setTimeRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [view, submitted, timeRemaining]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  useKeyboardShortcuts({
    enabled: view === 'questions' && !submitted && !showSubmitModal,
    activeQuestion,
    onNavigatePrev: () => setCurrentQuestionIdx((i) => Math.max(0, i - 1)),
    onNavigateNext: () =>
      setCurrentQuestionIdx((i) =>
        Math.min((activeQuiz?.questions.length ?? 1) - 1, i + 1)
      ),
    onToggleFlag: toggleFlag,
    onAnswerSelect: handleAnswerSelect,
  });

  // ── Quiz lifecycle ────────────────────────────────────────────────────────

  function startQuiz(quiz) {
    if (!questionBank.length) {
      setError('Question bank is still loading. Please try again in a moment.');
      return;
    }
    setActiveQuiz(buildRandomQuiz(quiz, questionBank));
    setCurrentQuizConfig(quiz);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setSubmitted(false);
    setGradedResults(null);
    setView('questions');
    setError('');
    setTimeTakenSecs(null);
    setResultsFilter('all');
    setFlaggedSet(new Set());
    setShowSubmitModal(false);
    setTimeRemaining((quiz.time_limit_mins || 15) * 60);
    setQuizStartTime(Date.now());
  }

  function handleAnswerSelect(question, choiceId) {
    if (submitted) return;
    if (question.question_type === 'multiple_answers_question') {
      const cur = selectedAnswers[question.id] || [];
      const next = cur.includes(choiceId)
        ? cur.filter((id) => id !== choiceId)
        : [...cur, choiceId];
      setSelectedAnswers((a) => ({ ...a, [question.id]: next }));
      return;
    }
    setSelectedAnswers((a) => ({ ...a, [question.id]: choiceId }));
  }

  function handleTextAnswerChange(questionId, text) {
    if (submitted) return;
    setSelectedAnswers((a) => ({ ...a, [questionId]: text }));
  }

  function toggleFlag(questionId) {
    if (!questionId) return;
    setFlaggedSet((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }

  // ── Submit flow ───────────────────────────────────────────────────────────

  function handleSubmitClick() {
    setShowSubmitModal(true);
  }

  function confirmSubmit() {
    setShowSubmitModal(false);
    doSubmit();
  }

  function doSubmit() {
    if (!activeQuiz) return;

    const finalAnswers = {};
    activeQuiz.questions.forEach((q) => {
      finalAnswers[q.id] = selectedAnswers[q.id] || emptyAnswerFor(q);
    });

    // Capture closure values before the async gap
    const quiz = activeQuiz;
    const config = currentQuizConfig;
    const startTime = quizStartTime;

    setLoadingMessage('Calculating results & scoring responses…');
    setLoading(true);

    setTimeout(() => {
      const localResults = gradeLocalQuiz(quiz, finalAnswers);
      const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : null;

      setTimeTakenSecs(elapsed);
      setGradedResults(localResults);
      setSubmitted(true);
      setView('results');
      setError('');
      setLoading(false);
      setLoadingMessage('Loading quiz workspace');

      const attempt = {
        id: Date.now(),
        quizId: config?.id ?? quiz.id,
        quizTitle: quiz.title,
        score: localResults.score,
        maxScore: localResults.max_score,
        percentage: localResults.percentage,
        timeTaken: elapsed,
        date: new Date().toISOString(),
      };
      setAttemptHistory(saveAttemptHistory(attempt));

      // Grade essays in the background — updates gradedResults when each finishes
      gradeEssaysWithAI(quiz, finalAnswers, localResults);
    }, 1500);
  }

  // ── Essay AI grading ──────────────────────────────────────────────────────

  async function gradeEssaysWithAI(quiz, finalAnswers, localResults) {
    const essays = quiz.questions.filter((q) => q.question_type === 'essay_question');
    if (!essays.length) return;

    // Immediately mark all essays as in-progress
    const withLoading = {
      ...localResults,
      questions: { ...localResults.questions },
    };
    essays.forEach((q) => {
      if ((finalAnswers[q.id] || '').trim().length >= 5) {
        withLoading.questions[q.id] = {
          ...withLoading.questions[q.id],
          ai_grading: true,
        };
      }
    });
    setGradedResults({ ...withLoading });

    let running = { ...withLoading, questions: { ...withLoading.questions } };

    for (const question of essays) {
      const essay = (finalAnswers[question.id] || '').trim();
      if (essay.length < 5) continue;

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildEssayGradingPayload(question, essay)),
        });
        if (!res.ok) throw new Error('failed');

        const data = await res.json();
        const text = sanitizeAssistantContent(data.response);
        const match = text.match(/SCORE:\s*(\d+(?:\.\d+)?)/i);

        if (match) {
          const maxPts = question.points_possible || 1;
          const aiPts = Math.min(Math.max(parseFloat(match[1]), 0), maxPts);
          const feedback = text.replace(/SCORE:\s*[\d.]+/i, '').trim();

          running = {
            ...running,
            questions: {
              ...running.questions,
              [question.id]: {
                ...running.questions[question.id],
                ai_grading: false,
                ai_graded: true,
                is_correct: aiPts >= maxPts * 0.5,
                points_earned: aiPts,
                ai_feedback: feedback,
              },
            },
          };
        } else {
          running.questions[question.id] = {
            ...running.questions[question.id],
            ai_grading: false,
          };
        }
      } catch {
        running.questions[question.id] = {
          ...running.questions[question.id],
          ai_grading: false,
        };
      }

      // Recompute total score after each essay resolves
      let newScore = 0;
      quiz.questions.forEach((q) => {
        newScore += running.questions[q.id]?.points_earned || 0;
      });
      running = {
        ...running,
        score: newScore,
        percentage: Math.round((newScore / running.max_score) * 100),
      };
      setGradedResults({ ...running });
    }
  }

  // ── AI tutor ──────────────────────────────────────────────────────────────

  async function openAiTutorForQuestion(question) {
    if (!gradedResults) return;
    setActiveAiQuestion(question);
    setAiDrawerOpen(true);
    setChatHistory([]);
    setChatLoading(true);

    const gradeDetail = gradedResults.questions[question.id];
    const studentAnswer = selectedAnswers[question.id] || emptyAnswerFor(question);
    const starter =
      'Talk me through this like a tutor. Keep it short, point out the key idea, and give me one quick way to check my understanding.';

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildChatPayload(question, gradeDetail, studentAnswer, [], starter)),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = sanitizeAssistantContent(data.response);
      setChatHistory([
        {
          role: 'assistant',
          content: isAssistantServiceMessage(text)
            ? 'The AI service is not configured yet. Add a valid Groq API key to the backend and restart.'
            : text,
        },
      ]);
    } catch {
      setChatHistory([
        {
          role: 'assistant',
          content:
            'The AI service could not be reached. Check that the FastAPI backend is running on port 8000.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendChatMessage(customMessage = '') {
    const textToSend = customMessage || chatInput;
    if (!textToSend.trim() || !activeAiQuestion || chatLoading || !gradedResults) return;

    setChatHistory((h) => [...h, { role: 'user', content: textToSend }]);
    setChatInput('');
    setChatLoading(true);

    const gradeDetail = gradedResults.questions[activeAiQuestion.id];
    const studentAnswer = selectedAnswers[activeAiQuestion.id] || emptyAnswerFor(activeAiQuestion);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildChatPayload(activeAiQuestion, gradeDetail, studentAnswer, chatHistory, textToSend)
        ),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = sanitizeAssistantContent(data.response);
      setChatHistory((h) => [
        ...h,
        {
          role: 'assistant',
          content: isAssistantServiceMessage(text)
            ? 'The AI service is not configured yet. Add a valid Groq API key to the backend and restart.'
            : text,
        },
      ]);
    } catch {
      setChatHistory((h) => [
        ...h,
        { role: 'assistant', content: 'The AI service could not be reached. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleNavClick(targetView) {
    if (activeQuiz && !submitted && view === 'questions') {
      setPendingNavView(targetView);
    } else {
      setView(targetView);
    }
  }

  function confirmLeaveQuiz() {
    resetToDashboard();
    setView(pendingNavView);
    setPendingNavView(null);
  }

  function cancelLeaveQuiz() {
    setPendingNavView(null);
  }

  function resetToDashboard() {
    setActiveQuiz(null);
    setCurrentQuizConfig(null);
    setCurrentQuestionIdx(0);
    setSubmitted(false);
    setGradedResults(null);
    setSelectedAnswers({});
    setView('dashboard');
    setTimeRemaining(null);
    setTimeTakenSecs(null);
    setResultsFilter('all');
    setFlaggedSet(new Set());
    setShowSubmitModal(false);
  }

  function retakeQuiz() {
    if (currentQuizConfig) startQuiz(currentQuizConfig);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark">Q</div>
          <div>
            <h1>Codebench</h1>
            <p>Student practice</p>
          </div>
        </div>

        <nav className="side-nav">
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => handleNavClick('dashboard')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
              <rect x="1" y="1" width="7" height="7" rx="1.5" />
              <rect x="10" y="1" width="7" height="7" rx="1.5" />
              <rect x="1" y="10" width="7" height="7" rx="1.5" />
              <rect x="10" y="10" width="7" height="7" rx="1.5" />
            </svg>
            Dashboard
          </button>
          <button
            className={view === 'history' ? 'active' : ''}
            onClick={() => handleNavClick('history')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="9" r="7.5" />
              <polyline points="9 5 9 9 12 11" />
            </svg>
            History
          </button>
          <button
            className={view === 'results' ? 'active' : ''}
            onClick={() => submitted && setView('results')}
            disabled={!submitted}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
              <rect x="1" y="10" width="4" height="7" rx="1" />
              <rect x="7" y="6" width="4" height="11" rx="1" />
              <rect x="13" y="2" width="4" height="15" rx="1" />
            </svg>
            Results
          </button>
        </nav>

        {activeQuiz && (
          <div className="sidebar-panel">
            <div className="panel-header-row">
              <p className="eyebrow">Quiz progress</p>
              <span className="panel-pct">
                {Math.round((answeredCount / activeQuiz.questions.length) * 100)}%
              </span>
            </div>
            <div className="panel-count-row">
              <span className="panel-count-num">{answeredCount}</span>
              <span className="panel-count-label">
                &nbsp;/ {activeQuiz.questions.length} answered
              </span>
            </div>
            <div className="progress-track">
              <div
                style={{ width: `${(answeredCount / activeQuiz.questions.length) * 100}%` }}
              />
            </div>
            {flaggedCount > 0 && !submitted && (
              <div className="panel-flagged-row">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                  <path d="M2 1v10M2 1h7l-2 3.5L9 8H2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                {flaggedCount} flagged for review
              </div>
            )}
            <div className="panel-divider" />
            <div className="question-jump-list">
              {activeQuiz.questions.map((q, index) => {
                let dotClass = '';
                if (index === currentQuestionIdx) {
                  dotClass = 'current';
                } else if (submitted && gradedResults) {
                  dotClass = gradedResults.questions[q.id]?.is_correct
                    ? 'correct-dot'
                    : 'incorrect-dot';
                } else if (flaggedSet.has(q.id) && hasAnswer(q, selectedAnswers[q.id])) {
                  dotClass = 'answered-flagged-dot';
                } else if (flaggedSet.has(q.id)) {
                  dotClass = 'flagged-dot';
                } else if (hasAnswer(q, selectedAnswers[q.id])) {
                  dotClass = 'answered-dot';
                }
                return (
                  <button
                    key={q.id}
                    className={dotClass}
                    onClick={() => {
                      setCurrentQuestionIdx(index);
                      setView(submitted ? 'results' : 'questions');
                    }}
                    aria-label={`Go to question ${index + 1}`}
                    title={
                      submitted && gradedResults
                        ? gradedResults.questions[q.id]?.is_correct
                          ? 'Correct'
                          : 'Incorrect'
                        : flaggedSet.has(q.id)
                        ? 'Flagged for review'
                        : hasAnswer(q, selectedAnswers[q.id])
                        ? 'Answered'
                        : 'Not yet answered'
                    }
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            {!submitted && (
              <div className="panel-legend">
                <span>
                  <span className="legend-dot legend-dot--answered" />
                  Answered
                </span>
                <span>
                  <span className="legend-dot legend-dot--flagged" />
                  Flagged
                </span>
                <span>
                  <span className="legend-dot legend-dot--unanswered" />
                  Unanswered
                </span>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {view === 'history' ? 'Your progress' : 'Course assessment'}
            </p>
            <h2>
              {view === 'history'
                ? 'History'
                : activeQuiz?.title || 'Choose a quiz'}
            </h2>
          </div>
          <div className="topbar-actions">
            {view === 'questions' && timeRemaining !== null && (
              <div className={`quiz-timer ${timeRemaining < 60 ? 'low-time' : ''}`}>
                <span role="img" aria-label="Timer">⏱️</span>
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
            {activeQuiz && view !== 'dashboard' && (
              <button className="secondary-button" onClick={resetToDashboard}>
                Back to dashboard
              </button>
            )}
          </div>
        </header>

        {error && <div className="notice">{error}</div>}
        {loading && <LoadingState message={loadingMessage} />}

        {!loading && view === 'history' && (
          <History
            quizzes={quizzes}
            attemptHistory={attemptHistory}
          />
        )}

        {!loading && view === 'dashboard' && (
          <Dashboard
            quizzes={quizzes}
            submitted={submitted}
            gradedResults={gradedResults}
            activeQuiz={activeQuiz}
            timeTakenSecs={timeTakenSecs}
            attemptHistory={attemptHistory}
            onStartQuiz={startQuiz}
            onViewResults={() => setView('results')}
            onRetake={retakeQuiz}
          />
        )}

        {!loading && view === 'questions' && activeQuiz && activeQuestion && (
          <QuizQuestion
            quiz={activeQuiz}
            question={activeQuestion}
            currentQuestionIdx={currentQuestionIdx}
            selectedAnswers={selectedAnswers}
            submitted={submitted}
            isFlagged={flaggedSet.has(activeQuestion.id)}
            onAnswerSelect={handleAnswerSelect}
            onTextAnswerChange={handleTextAnswerChange}
            onToggleFlag={() => toggleFlag(activeQuestion.id)}
            onPrevious={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
            onNext={() =>
              setCurrentQuestionIdx((i) =>
                Math.min(activeQuiz.questions.length - 1, i + 1)
              )
            }
            onSubmitClick={handleSubmitClick}
          />
        )}

        {!loading && view === 'results' && submitted && activeQuiz && gradedResults && (
          <Results
            quiz={activeQuiz}
            gradedResults={gradedResults}
            selectedAnswers={selectedAnswers}
            timeTakenSecs={timeTakenSecs}
            filter={resultsFilter}
            onFilterChange={setResultsFilter}
            onDiscuss={openAiTutorForQuestion}
            onRetake={retakeQuiz}
          />
        )}
      </main>

      {/* ── Overlays ── */}
      {pendingNavView && activeQuiz && (
        <LeaveQuizModal
          answeredCount={answeredCount}
          totalCount={activeQuiz.questions.length}
          onConfirm={confirmLeaveQuiz}
          onCancel={cancelLeaveQuiz}
        />
      )}

      {showSubmitModal && activeQuiz && (
        <SubmitModal
          quiz={activeQuiz}
          answeredCount={answeredCount}
          flaggedCount={flaggedCount}
          onConfirm={confirmSubmit}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}

      <AssistantDrawer
        isOpen={aiDrawerOpen}
        question={activeAiQuestion}
        gradedResults={gradedResults}
        selectedAnswers={selectedAnswers}
        chatHistory={chatHistory}
        chatInput={chatInput}
        chatLoading={chatLoading}
        chatEndRef={chatEndRef}
        onClose={() => setAiDrawerOpen(false)}
        onChatInput={setChatInput}
        onSend={sendChatMessage}
      />
    </div>
  );
}
