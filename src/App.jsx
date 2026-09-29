import { useCallback, useRef, useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { colorFor, pickRandom, uid } from "./utils/wheel.js";
import WheelCanvas from "./components/WheelCanvas.jsx";
import ResultCards from "./components/ResultCards.jsx";
import PeoplePanel from "./components/PeoplePanel.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import Toast from "./components/Toast.jsx";

export default function App() {
  const [people, setPeople] = useLocalStorage("scrumWheel.people", []);
  const [history, setHistory] = useLocalStorage("scrumWheel.history", []);
  const [spinning, setSpinning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false });
  const wheelRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }, []);

  function addPerson(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`${trimmed} is already on the team.`);
      return;
    }
    setPeople([...people, { id: uid(), name: trimmed, color: colorFor(people.length), present: true }]);
  }

  function removePerson(id) {
    const person = people.find((p) => p.id === id);
    setPeople(people.filter((p) => p.id !== id));
    if (person) showToast(`${person.name} removed from the team.`);
  }

  function togglePresent(id, present) {
    setPeople(people.map((p) => (p.id === id ? { ...p, present } : p)));
  }

  function setAllPresent(present) {
    setPeople(people.map((p) => ({ ...p, present })));
  }

  function spin() {
    if (spinning) return;
    const presentPeople = people.filter((p) => p.present !== false);
    if (presentPeople.length < 2) {
      showToast("Mark at least 2 people present before spinning.");
      return;
    }

    const winner = pickRandom(presentPeople);
    setSpinning(true);
    setStatusMsg("Spinning…");

    wheelRef.current.spinToWinner(winner.id, () => {
      setHistory([...history, { id: winner.id, name: winner.name, date: Date.now() }]);
      setSpinning(false);
      setStatusMsg("");
      showToast(`🎉 ${winner.name} will present tomorrow!`);
    });
  }

  const sortedHistory = [...history].sort((a, b) => b.date - a.date);
  const [latest, previous] = sortedHistory;

  return (
    <>
      <div className="bg-blobs" aria-hidden="true">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>

      <div className="app">
        <header className="app-header">
          <h1>🎯 Daily Scrum Wheel</h1>
          <p className="subtitle">Spin to decide who presents tomorrow</p>
        </header>

        <main className="layout">
          <section className="wheel-section">
            <WheelCanvas ref={wheelRef} people={people}>
              <button
                type="button"
                className="spin-btn"
                onClick={spin}
                disabled={spinning}
              >
                SPIN
              </button>
            </WheelCanvas>

            <ResultCards next={latest?.name} last={previous?.name} />
          </section>

          <section className="panel">
            <PeoplePanel
              people={people}
              onAdd={addPerson}
              onRemove={removePerson}
              onTogglePresent={togglePresent}
              onSetAllPresent={setAllPresent}
            />
            <HistoryPanel history={history} />
          </section>
        </main>

        <footer className="app-footer">
          <span className="status-msg">{statusMsg}</span>
        </footer>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
