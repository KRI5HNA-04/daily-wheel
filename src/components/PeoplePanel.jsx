import { useState } from "react";

export default function PeoplePanel({
  people,
  onAdd,
  onRemove,
  onTogglePresent,
  onSetAllPresent,
}) {
  const [name, setName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onAdd(name);
    setName("");
  }

  return (
    <div className="panel-block">
      <h2>Team Members</h2>
      <form className="add-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Add team member…"
          autoComplete="off"
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="add-btn" aria-label="Add member">
          +
        </button>
      </form>

      <div className="presence-actions">
        <span className="hint">Check off who's in today's standup</span>
        <span className="presence-buttons">
          <button type="button" className="link-btn" onClick={() => onSetAllPresent(true)}>
            All present
          </button>
          <button type="button" className="link-btn" onClick={() => onSetAllPresent(false)}>
            Clear
          </button>
        </span>
      </div>

      <ul className="people-list">
        {people.map((person) => (
          <li key={person.id} className={person.present === false ? "is-absent" : ""}>
            <span className="person-name">
              <input
                type="checkbox"
                className="present-checkbox"
                checked={person.present !== false}
                aria-label={`${person.name} present today`}
                onChange={(e) => onTogglePresent(person.id, e.target.checked)}
              />
              <span className="swatch" style={{ background: person.color }} />
              {person.name}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <button
                type="button"
                className="remove-btn"
                aria-label={`Remove ${person.name}`}
                onClick={() => onRemove(person.id)}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className={`empty-state ${people.length === 0 ? "visible" : ""}`}>
        Add teammates to start spinning the wheel.
      </p>
    </div>
  );
}
