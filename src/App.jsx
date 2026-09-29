import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { colorFor, pickRandom, uid } from "./utils/wheel.js";
import WheelCanvas from "./components/WheelCanvas.jsx";
import ResultCards from "./components/ResultCards.jsx";
import PeoplePanel from "./components/PeoplePanel.jsx";
import Toast from "./components/Toast.jsx";

function normalizeSharedPeople(people) {
  if (!Array.isArray(people)) return [];

  return people.map((person, index) => ({
    id: typeof person?.id === "string" ? person.id : uid(),
    name: String(person?.name || "").trim(),
    color: person?.color || colorFor(index),
    present: person?.present !== false,
  })).filter((person) => person.name);
}

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

  useEffect(() => {
    const shareId = new URLSearchParams(window.location.search).get("s");
    if (!shareId) return;

    let cancelled = false;
    setStatusMsg("Loading shared team…");

    fetch(`/api/share?s=${encodeURIComponent(shareId)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to load shared team.");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const sharedPeople = normalizeSharedPeople(data.people);
        if (!sharedPeople.length) throw new Error("The shared team is empty.");

        setPeople(sharedPeople);
        setStatusMsg("");
        showToast(`Loaded ${sharedPeople.length} shared team member${sharedPeople.length === 1 ? "" : "s"}.`);

        // Remove the share id from the visible URL after loading. The current
        // participant list remains in localStorage, while the copied share link
        // stays clean and short.
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatusMsg("");
        showToast(error.message || "Unable to load shared team.");
      });

    return () => {
      cancelled = true;
    };
  }, [setPeople, showToast]);

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

  async function shareTeam() {
    if (!people.length) {
      showToast("Add at least one team member before sharing.");
      return;
    }

    try {
      setStatusMsg("Creating share link…");
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people: people.map(({ id, name, color, present }) => ({ id, name, color, present })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create share link.");

      const shareUrl = `${window.location.origin}${window.location.pathname}?s=${encodeURIComponent(data.id)}`;
      await navigator.clipboard.writeText(shareUrl);
      setStatusMsg("");
      showToast("Share link copied! Anyone with the link can see this team.");
    } catch (error) {
      setStatusMsg("");
      showToast(error.message || "Unable to create share link.");
    }
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
          <div className="header-row">
            <div>
              <h1 className="app-title">
                <img
                  src="./images.png"
                  alt="MSG"
                  className="app-logo"
                />
                <span>Daily Scrum Wheel</span>
              </h1>
              <p className="subtitle">Spin to decide who presents tomorrow</p>
            </div>
            <button type="button" className="share-team-btn" onClick={shareTeam}>
              ↗ Share Team
            </button>
          </div>
        </header>

        <main className="layout">
          <section className="wheel-section">
            <WheelCanvas ref={wheelRef} people={people}>
              {people.filter((p) => p.present !== false).length >= 2 && (
                <button
                  type="button"
                  className="spin-btn"
                  onClick={spin}
                  disabled={spinning}
                >
                  SPIN
                </button>
              )}
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
              onShare={shareTeam}
            />
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
