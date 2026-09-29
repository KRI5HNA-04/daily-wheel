import { daysAgo } from "../utils/wheel.js";

const COOLDOWN_DAYS = 7;

export default function HistoryPanel({ history }) {
  const recent = [...history]
    .filter((h) => daysAgo(h.date) < COOLDOWN_DAYS)
    .sort((a, b) => b.date - a.date);

  return (
    <div className="panel-block">
      <h2>This Week's Winners</h2>
      <ul className="history-list">
        {recent.map((h, i) => (
          <li key={`${h.id}-${h.date}-${i}`}>
            <span>{h.name}</span>
            <span className="history-date">
              {new Date(h.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className={`empty-state ${recent.length === 0 ? "visible" : ""}`}>
        No spins yet this week.
      </p>
    </div>
  );
}
