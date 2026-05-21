import { ReactNode } from 'react';

type Props = {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  trackColor?: string;
  fillColor?: string;
  children?: ReactNode;
};

// SVG donut ring. Cleaner than conic-gradient and matches the .pen's stacked
// ellipses (innerRadius 0.82 ≈ stroke 18 on a 100 radius).
export function CycleRing({
  size = 160,
  strokeWidth = 14,
  progress,
  trackColor = '#FFFFFF26',
  fillColor = '#C8FF6B',
  children,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, progress)) * c;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="relative grid place-items-center text-center">{children}</div>
    </div>
  );
}
