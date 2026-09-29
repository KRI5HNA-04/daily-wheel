export default function ResultCards({ next, last }) {
  return (
    <div className="result-cards">
      <div className="result-card next-card">
        <span className="result-label">Presenting Tomorrow</span>
        <span className="result-name">{next || "—"}</span>
      </div>
      <div className="result-card last-card">
        <span className="result-label">Last Time's Winner</span>
        <span className="result-name">{last || "—"}</span>
      </div>
    </div>
  );
}
