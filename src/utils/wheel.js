export const PALETTE = [
  "#7f5af0", "#2cb67d", "#ff8906", "#ff5470", "#00b4d8",
  "#f25f4c", "#e0aaff", "#4ea8de", "#f9c74f", "#90be6d",
];

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function colorFor(index) {
  return PALETTE[index % PALETTE.length];
}

export function daysAgo(timestamp) {
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function drawWheel(canvas, people) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6;

  ctx.clearRect(0, 0, size, size);

  if (people.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.fillStyle = "#b8b8c0";
    ctx.font = "600 18px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add people to spin", cx, cy);
    return;
  }

  const segAngle = (Math.PI * 2) / people.length;
  const start = -Math.PI / 2;

  people.forEach((person, i) => {
    const angleStart = start + i * segAngle;
    const angleEnd = angleStart + segAngle;
    const absent = person.present === false;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angleStart, angleEnd);
    ctx.closePath();
    ctx.fillStyle = absent ? "rgba(120,120,130,0.35)" : person.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleStart + segAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = absent ? "rgba(255,255,255,0.55)" : "#fff";
    ctx.font = "600 15px Segoe UI, sans-serif";
    const label =
      person.name.length > 14 ? person.name.slice(0, 13) + "…" : person.name;
    ctx.fillText(label, radius - 16, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Computes the rotation (deg) needed to land the pointer (fixed at top) on winnerIndex's segment.
export function rotationForWinner(currentRotation, peopleCount, winnerIndex) {
  const segAngle = 360 / peopleCount;
  const segMidAngleAtZero = -90 + winnerIndex * segAngle + segAngle / 2;
  const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full turns
  const currentMod = ((currentRotation % 360) + 360) % 360;
  let delta = -90 - segMidAngleAtZero - currentMod;
  delta = ((delta % 360) + 360) % 360;
  return currentRotation + extraSpins * 360 + delta;
}
