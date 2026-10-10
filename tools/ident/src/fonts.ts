//
// Copyright 2026 DXOS.org
//

import { continueRender, delayRender, staticFile } from 'remotion';

import { FONT_FAMILY } from './brand.ts';

// Sharp Sans is licensed, so it is not committed (see .gitignore).
// Put SharpSansDispNo1-Medium.ttf in public/fonts/. If it is missing,
// the videos still render in the fallback stack and a warning is logged.
const FONT_FILE = 'fonts/SharpSansDispNo1-Medium.ttf';

let started = false;

export const loadBrandFont = () => {
  if (started || typeof document === 'undefined') {
    return;
  }
  started = true;
  const handle = delayRender('Loading Sharp Sans');
  const face = new FontFace(FONT_FAMILY, `url(${staticFile(FONT_FILE)})`, { weight: '100 900' });
  face
    .load()
    .then((loaded) => {
      (document.fonts as unknown as Set<FontFace>).add(loaded);
    })
    .catch(() => {
      console.warn(`[fonts] ${FONT_FILE} not found; using fallback fonts.`);
    })
    .finally(() => continueRender(handle));
};
