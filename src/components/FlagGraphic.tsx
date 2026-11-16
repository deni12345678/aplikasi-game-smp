import React from 'react';

interface FlagGraphicProps {
  countryCode: string;
  className?: string;
}

export const FlagGraphic: React.FC<FlagGraphicProps> = ({ countryCode, className = '' }) => {
  const code = countryCode.toUpperCase();

  const renderSvgContent = () => {
    switch (code) {
      case 'ID':
        return (
          <>
            <rect width="120" height="40" fill="#CE1126" />
            <rect y="40" width="120" height="40" fill="#FFFFFF" />
          </>
        );
      case 'JP':
        return (
          <>
            <rect width="120" height="80" fill="#FFFFFF" />
            <circle cx="60" cy="40" r="22" fill="#BC002D" />
          </>
        );
      case 'PS':
        return (
          <>
            <rect width="120" height="26.7" fill="#0F172A" />
            <rect y="26.7" width="120" height="26.7" fill="#FFFFFF" />
            <rect y="53.3" width="120" height="26.7" fill="#007A3D" />
            <polygon points="0,0 44,40 0,80" fill="#CE1126" />
          </>
        );
      case 'SA':
        return (
          <>
            <rect width="120" height="80" fill="#006C35" />
            {/* Stylized Arabic calligraphy & sword motif */}
            <g fill="#FFFFFF">
              <rect x="30" y="25" width="60" height="4" rx="2" />
              <rect x="36" y="33" width="48" height="3.5" rx="1.5" />
              <rect x="40" y="20" width="4" height="12" rx="1.5" />
              <rect x="52" y="19" width="4" height="13" rx="1.5" />
              <rect x="64" y="20" width="4" height="12" rx="1.5" />
              <rect x="76" y="21" width="4" height="11" rx="1.5" />
              {/* Sword below */}
              <rect x="30" y="51" width="54" height="3.5" rx="1.5" />
              <polygon points="84,49 92,52.75 84,56.5" />
              <rect x="27" y="47" width="3" height="11.5" rx="1" />
            </g>
          </>
        );
      case 'EG':
        return (
          <>
            <rect width="120" height="26.7" fill="#CE1126" />
            <rect y="26.7" width="120" height="26.7" fill="#FFFFFF" />
            <rect y="53.3" width="120" height="26.7" fill="#0F172A" />
            {/* Golden Eagle of Saladin simplified emblem */}
            <path
              d="M60 31 L65 36 L63 48 L60 50 L57 48 L55 36 Z M53 37 L67 37 L65 41 L55 41 Z"
              fill="#C09300"
            />
          </>
        );
      case 'MA':
        return (
          <>
            <rect width="120" height="80" fill="#C1272D" />
            <polygon
              points="60,22 64.5,35.5 78.5,35.5 67.2,43.8 71.5,57.2 60,49 48.5,57.2 52.8,43.8 41.5,35.5 55.5,35.5"
              fill="none"
              stroke="#006233"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
          </>
        );
      case 'ZA':
        return (
          <>
            <rect width="120" height="40" fill="#E03C31" />
            <rect y="40" width="120" height="40" fill="#001489" />
            <polygon points="0,0 56,40 0,80" fill="#FFFFFF" />
            <rect y="31" width="120" height="18" fill="#FFFFFF" />
            <polygon points="0,4 50,40 0,76" fill="#007749" />
            <rect y="34" width="120" height="12" fill="#007749" />
            <polygon points="0,14 34,40 0,66" fill="#FFB81C" />
            <polygon points="0,19 27,40 0,61" fill="#0F172A" />
          </>
        );
      case 'NG':
        return (
          <>
            <rect width="40" height="80" fill="#008751" />
            <rect x="40" width="40" height="80" fill="#FFFFFF" />
            <rect x="80" width="40" height="80" fill="#008751" />
          </>
        );
      case 'FR':
        return (
          <>
            <rect width="40" height="80" fill="#0055A4" />
            <rect x="40" width="40" height="80" fill="#FFFFFF" />
            <rect x="80" width="40" height="80" fill="#EF4135" />
          </>
        );
      case 'DE':
        return (
          <>
            <rect width="120" height="26.7" fill="#0F172A" />
            <rect y="26.7" width="120" height="26.7" fill="#DD0000" />
            <rect y="53.3" width="120" height="26.7" fill="#FFCE00" />
          </>
        );
      case 'IT':
        return (
          <>
            <rect width="40" height="80" fill="#009246" />
            <rect x="40" width="40" height="80" fill="#FFFFFF" />
            <rect x="80" width="40" height="80" fill="#CE2B37" />
          </>
        );
      case 'SE':
        return (
          <>
            <rect width="120" height="80" fill="#006AA7" />
            <rect x="34" width="14" height="80" fill="#FECC02" />
            <rect y="33" width="120" height="14" fill="#FECC02" />
          </>
        );
      case 'US':
        return (
          <>
            <rect width="120" height="80" fill="#FFFFFF" />
            {[0, 2, 4, 6, 8, 10, 12].map((i) => (
              <rect
                key={i}
                y={(i * 80) / 13}
                width="120"
                height={80 / 13 + 0.3}
                fill="#B22234"
              />
            ))}
            <rect width="52" height={(7 * 80) / 13} fill="#3C3B6E" />
            {[10, 21, 32].map((cy, rowIdx) =>
              [10, 20, 30, 40].map((cx, colIdx) => (
                <circle
                  key={`${rowIdx}-${colIdx}`}
                  cx={cx + (rowIdx % 2 === 1 ? 3 : 0)}
                  cy={cy}
                  r="1.7"
                  fill="#FFFFFF"
                />
              ))
            )}
          </>
        );
      case 'BR':
        return (
          <>
            <rect width="120" height="80" fill="#009C3B" />
            <polygon points="60,12 104,40 60,68 16,40" fill="#FFDF00" />
            <circle cx="60" cy="40" r="16" fill="#002776" />
            <path
              d="M44.5 38 Q60 32 75.5 42"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.2"
            />
          </>
        );
      case 'CA':
        return (
          <>
            <rect width="30" height="80" fill="#FF0000" />
            <rect x="30" width="60" height="80" fill="#FFFFFF" />
            <rect x="90" width="30" height="80" fill="#FF0000" />
            <path
              d="M60 19 L63.5 30 L71 27 L67 36 L75 38 L69 44 L71 49 L62 48 L62 59 L58 59 L58 48 L49 49 L51 44 L45 38 L53 36 L49 27 L56.5 30 Z"
              fill="#FF0000"
            />
          </>
        );
      case 'AR':
        return (
          <>
            <rect width="120" height="26.7" fill="#74ACDF" />
            <rect y="26.7" width="120" height="26.7" fill="#FFFFFF" />
            <rect y="53.3" width="120" height="26.7" fill="#74ACDF" />
            <circle cx="60" cy="40" r="9.5" fill="#F6B40E" />
            <circle cx="60" cy="40" r="6" fill="#FBBF24" />
          </>
        );
      default:
        return (
          <>
            <rect width="120" height="80" fill="#E2E8F0" />
            <text
              x="60"
              y="44"
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="#334155"
            >
              {code}
            </text>
          </>
        );
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs ${className}`}
    >
      <svg
        viewBox="0 0 120 80"
        className="block h-full w-full"
        role="img"
        aria-label={`Bendera negara ${code}`}
      >
        {renderSvgContent()}
      </svg>
    </div>
  );
};
