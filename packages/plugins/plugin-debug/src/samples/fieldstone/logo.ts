//
// Copyright 2026 DXOS.org
//

/** Geometric marks drawn in white inside a 64-unit box centred at (160, 70). */
const MARKS = {
  circle: '<circle cx="160" cy="70" r="28" fill="#fff"/>',
  ring: '<circle cx="160" cy="70" r="24" fill="none" stroke="#fff" stroke-width="9"/>',
  rings:
    '<g fill="none" stroke="#fff" stroke-width="6"><circle cx="148" cy="70" r="20"/><circle cx="172" cy="70" r="20"/></g>',
  diamond: '<path d="M160 40l30 30-30 30-30-30z" fill="#fff"/>',
  triangle: '<path d="M160 40l32 58h-64z" fill="#fff"/>',
  peaks: '<path d="M126 98l22-40 14 24 10-16 22 32z" fill="#fff"/>',
  hexagon: '<path d="M160 40l26 15v30l-26 15-26-15V55z" fill="#fff"/>',
  bars: '<g fill="#fff"><rect x="132" y="68" width="14" height="30" rx="3"/><rect x="153" y="54" width="14" height="44" rx="3"/><rect x="174" y="42" width="14" height="56" rx="3"/></g>',
  wave: '<path d="M126 62q11-14 22 0t22 0 22 0M126 82q11-14 22 0t22 0 22 0" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
  chevron:
    '<path d="M132 52l18 18-18 18M158 52l18 18-18 18" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
  star: '<path d="M160 40l8 22h23l-19 14 7 22-19-13-19 13 7-22-19-14h23z" fill="#fff"/>',
  wing: '<path d="M126 92c20-4 38-20 50-48 4 18 0 36-10 48z" fill="#fff"/>',
  cross: '<path d="M152 42h16v20h20v16h-20v20h-16V78h-20V62h20z" fill="#fff"/>',
  arc: '<path d="M130 92a30 30 0 0 1 60 0" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/><circle cx="160" cy="54" r="9" fill="#fff"/>',
  square:
    '<rect x="137" y="47" width="46" height="46" rx="10" fill="none" stroke="#fff" stroke-width="8"/><rect x="152" y="62" width="16" height="16" rx="3" fill="#fff"/>',
  dots: '<g fill="#fff"><circle cx="146" cy="56" r="11"/><circle cx="174" cy="56" r="11"/><circle cx="146" cy="84" r="11"/><circle cx="174" cy="84" r="11"/></g>',
  bolt: '<path d="M168 40l-30 36h18l-6 26 30-38h-18z" fill="#fff"/>',
  saucer:
    '<g fill="#fff"><ellipse cx="160" cy="76" rx="34" ry="10"/><path d="M142 72a18 18 0 0 1 36 0z"/></g><circle cx="160" cy="98" r="4" fill="#fff"/>',
} as const;

export type LogoMark = keyof typeof MARKS;

/**
 * A 16:9 brand banner (mark over wordmark) as an SVG data URL: `Organization.image` is a URL string, and the
 * Organization card shows it as a full-bleed poster, so the banner's ratio matches the poster's to avoid a crop.
 */
export const makeLogo = (name: string, background: string, mark: LogoMark): string => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">',
    `<rect width="320" height="180" fill="${background}"/>`,
    MARKS[mark],
    '<text x="160" y="140" fill="#fff" font-family="system-ui,sans-serif" font-size="20" font-weight="600" text-anchor="middle">',
    name.replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    '</text></svg>',
  ].join('');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
