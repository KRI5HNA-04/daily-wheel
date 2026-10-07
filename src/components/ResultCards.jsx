export default function ResultCards({ next }) {
  return (
    <div className="result-cards">
      <div className="result-card next-card">
        <span className="result-label">Presenting Tomorrow</span>
        <span className="result-name">{next || "—"}</span>
      </div>
    </div>
  );
}
