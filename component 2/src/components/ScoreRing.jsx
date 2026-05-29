export function ScoreRing({ percentage, size = 130 }) {
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * (Math.min(percentage, 100) / 100);
  const color =
    percentage >= 80 ? 'var(--success)' : percentage >= 60 ? '#d97706' : 'var(--danger)';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="score-ring-svg"
      aria-label={`Score: ${percentage}%`}
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8ecf4" strokeWidth={size * 0.09} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.09}
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      <text
        x={cx}
        y={cy - size * 0.06}
        textAnchor="middle"
        fontSize={size * 0.165}
        fontWeight="800"
        fill="#1f2937"
      >
        {percentage}%
      </text>
      <text
        x={cx}
        y={cy + size * 0.12}
        textAnchor="middle"
        fontSize={size * 0.085}
        fill="#6b7280"
      >
        Score
      </text>
    </svg>
  );
}
