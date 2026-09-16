//
// Copyright 2026 DXOS.org
//

/**
 * Shown while Composer is not connected. The device is owned by this plugin and Composer only
 * supplies content, so a disconnected key has to say so rather than keep stale pixels.
 */
export const offlineKey = (size = 144): string =>
  [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    `<rect x="0" y="0" width="${size}" height="${size}" rx="${Math.round(size * 0.11)}" fill="#0e0f12" stroke="#1e2126" stroke-width="2"/>`,
    `<circle cx="${size / 2}" cy="${Math.round(size * 0.42)}" r="${Math.round(size * 0.1)}" fill="none" stroke="#3d434d" stroke-width="4"/>`,
    `<line x1="${Math.round(size * 0.38)}" y1="${Math.round(size * 0.5)}" x2="${Math.round(size * 0.62)}" y2="${Math.round(size * 0.34)}" stroke="#3d434d" stroke-width="4"/>`,
    `<text x="${size / 2}" y="${Math.round(size * 0.74)}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${Math.round(size * 0.11)}" fill="#5b6270">Composer</text>`,
    `<text x="${size / 2}" y="${Math.round(size * 0.88)}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="${Math.round(size * 0.1)}" fill="#3d434d">offline</text>`,
    '</svg>',
  ].join('');

/** Touch-strip equivalent of {@link offlineKey}. */
export const offlineDial = { title: 'Composer', value: 'offline' } as const;
