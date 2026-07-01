// Circular radar-style indicator: fills in as the user gets closer to the office.
// distance: current distance in meters, radius: allowed geofence radius in meters
export default function DistanceRing({ distance, radius, status }) {
  const size = 220;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  // Map distance to a 0-1 "closeness" value. Beyond 3x radius is considered "far" (0 fill).
  const farCap = radius * 3;
  const clamped = Math.min(distance, farCap);
  const closeness = status === 'locating' ? 0 : 1 - clamped / farCap;
  const dash = circumference * Math.max(closeness, 0.03);

  const inRange = distance <= radius;

  const ringColor =
    status === 'locating' ? 'var(--text-secondary)' : inRange ? 'var(--mint)' : 'var(--amber)';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        {status === 'locating' ? (
          <>
            <PulseDot />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              Finding your location…
            </span>
          </>
        ) : (
          <>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 30,
                color: 'var(--text-primary)',
              }}
            >
              {Math.round(distance)}m
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {inRange ? 'within range' : `of ${radius}m needed`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function PulseDot() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'var(--slate)',
        display: 'inline-block',
        animation: 'attendly-pulse 1.4s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes attendly-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </span>
  );
}
