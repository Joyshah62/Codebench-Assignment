import { useEffect, useRef } from 'react';

/**
 * Attaches keyboard shortcuts for the quiz question view.
 * Uses a ref to hold callbacks so the event listener never needs to be
 * re-added — only the `enabled` flag re-triggers the effect.
 */
export function useKeyboardShortcuts({
  enabled,
  activeQuestion,
  onNavigatePrev,
  onNavigateNext,
  onToggleFlag,
  onAnswerSelect,
}) {
  const cb = useRef({});
  cb.current = { onNavigatePrev, onNavigateNext, onToggleFlag, onAnswerSelect, activeQuestion };

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e) {
      const { onNavigatePrev, onNavigateNext, onToggleFlag, onAnswerSelect, activeQuestion } =
        cb.current;

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          onNavigateNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          onNavigatePrev();
          break;
        case 'f':
        case 'F':
          if (activeQuestion) onToggleFlag(activeQuestion.id);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5': {
          const isChoice = ['multiple_choice_question', 'true_false_question'].includes(
            activeQuestion?.question_type
          );
          if (isChoice && activeQuestion?.choices) {
            const choice = activeQuestion.choices[parseInt(e.key, 10) - 1];
            if (choice) onAnswerSelect(activeQuestion, choice.id);
          }
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
