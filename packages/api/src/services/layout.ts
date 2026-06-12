const GOLDEN_ANGLE = 2.39996322972865332; // radians
const SPACING = 320;

export function goldenAnglePosition(n: number): { x: number; y: number } {
  if (n === 0) return { x: 0, y: 0 };
  const angle = n * GOLDEN_ANGLE;
  const radius = SPACING * Math.sqrt(n);
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}
