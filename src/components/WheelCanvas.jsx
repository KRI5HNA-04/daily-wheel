import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { drawWheel, rotationForWinner } from "../utils/wheel.js";

const WheelCanvas = forwardRef(function WheelCanvas({ people, children }, ref) {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    drawWheel(canvasRef.current, people);
  }, [people]);

  useImperativeHandle(ref, () => ({
    spinToWinner(winnerId, onComplete) {
      const canvas = canvasRef.current;
      const winnerIndex = people.findIndex((p) => p.id === winnerId);
      if (winnerIndex === -1) return;

      const target = rotationForWinner(rotationRef.current, people.length, winnerIndex);
      rotationRef.current = target;
      canvas.style.transform = `rotate(${target}deg)`;

      const onTransitionEnd = () => {
        canvas.removeEventListener("transitionend", onTransitionEnd);
        onComplete();
      };
      canvas.addEventListener("transitionend", onTransitionEnd, { once: true });
    },
  }));

  return (
    <div className="wheel-wrapper">
      <div className="pointer" aria-hidden="true" />
      <canvas ref={canvasRef} id="wheelCanvas" width={480} height={480} />
      {children}
    </div>
  );
});

export default WheelCanvas;
