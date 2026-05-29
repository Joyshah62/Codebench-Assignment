export function LoadingState({ message = 'Loading quiz workspace' }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  );
}
