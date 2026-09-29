import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { colorFor, pickRandom, uid } from "./utils/wheel.js";
import WheelCanvas from "./components/WheelCanvas.jsx";
import ResultCards from "./components/ResultCards.jsx";
import PeoplePanel from "./components/PeoplePanel.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import Toast from "./components/Toast.jsx";

const PEOPLE_STORAGE_KEY = "scrumWheel.people";
const HISTORY_STORAGE_KEY = "scrumWheel.history";
const SHARE_PARAM = "people";

function readPeopleFromShareLink() {
  try {
    const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    if (!encoded) return null;

    const parsed = JSON.parse(decodeURIComponent(encoded));
    if (!Array.isArray(parsed)) return null;

    return parsed
      .filter((person) => person && typeof person.name === "string" && person.name.trim())
      .map((person, index) => ({
        id: typeof person.id === "string" && person.id ? person.id : uid(),
        name: person.name.trim().slice(0, 30),
        color: typeof person.color === "string" ? person.color : colorFor(index),
        present: person.present !== false,
      }));
  } catch {
    return null;
  }
}

function createShareLink(people) {
  const payload = people.map(({ id, name, color, present }) => ({
    id,
    name,
    color,
    present: present !== false,
  }));

  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(SHARE_PARAM, encodeURIComponent(JSON.stringify(payload)));
  return url.toString();
}

export default function App() {
  const sharedPeople = readPeopleFromShareLink();
  const [people, setPeople] = useLocalStorage(PEOPLE_STORAGE_KEY, sharedPeople ?? []);
  const [history, setHistory] = useLocalStorage(HISTORY_STORAGE_KEY, []);
  const [spinning, setSpinning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false });
  const wheelRef = useRef(null);
  const toastTimer = useRef(null);

  // A shared link is a snapshot of the owner's participant list. Once loaded,
  // remove the query parameter so refreshing the page uses localStorage normally.
  useEffect(() => {
    if (!sharedPeople) return;

    // Shared links take precedence over an existing local participant list.
    // This makes the same link work even if the recipient already used the app.
    setPeople(sharedPeople);

    const url = new URL(window.location.href);
    url.searchParams.delete(SHARE_PARAM);
    window.history.replaceState({}, "", url.toString());
    showToast("Shared participant list loaded.");
  }, []);

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
    setPeople([
      ...people,
      { id: uid(), name: trimmed, color: colorFor(people.length), present: true },
    ]);
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

  async function sharePeople() {
    if (people.length === 0) {
      showToast("Add at least one team member before sharing.");
      return;
    }

    const shareUrl = createShareLink(people);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Daily Scrum Wheel",
          text: "Open this Daily Scrum Wheel with our team members already added.",
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied to clipboard!");
    } catch (error) {
      // Closing the native share dialog is not an error from the user's perspective.
      if (error?.name !== "AbortError") {
        showToast("Couldn't copy the link. Please copy it from the address bar.");
      }
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
          <div>
            <h1>🎯 Daily Scrum Wheel</h1>
            <p className="subtitle">Spin to decide who presents tomorrow</p>
          </div>
          <button type="button" className="share-btn" onClick={sharePeople}>
            ↗ Share Team
          </button>
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
              onShare={sharePeople}
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
