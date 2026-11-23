//
// Copyright 2026 DXOS.org
//

import { continueRender, delayRender, staticFile } from 'remotion';

// DM Sans and DM Mono are OFL and committed; Sharp Sans is licensed and only on machines that have it (see .gitignore).
const FACES: { family: string; file: string; weight: string }[] = [
  { family: 'DM Sans', file: 'fonts/DMSans-Regular.ttf', weight: '400' },
  { family: 'DM Sans', file: 'fonts/DMSans-Medium.ttf', weight: '500' },
  { family: 'DM Sans', file: 'fonts/DMSans-Bold.ttf', weight: '600 700' },
  { family: 'DM Mono', file: 'fonts/DMMono-Regular.ttf', weight: '400' },
  { family: 'DM Mono', file: 'fonts/DMMono-Medium.ttf', weight: '500' },
  { family: 'Sharp Sans', file: 'fonts/SharpSansDispNo1-Medium.ttf', weight: '100 900' },
];

let started = false;

/** Loads the neu-dark fonts once, holding the render until they are ready so no frame is set in a fallback face. */
export const loadNeuFonts = () => {
  if (started || typeof document === 'undefined') {
    return;
  }
  started = true;
  const handle = delayRender('Loading DM Sans and DM Mono');
  void Promise.all(
    FACES.map(({ family, file, weight }) =>
      new FontFace(family, `url(${staticFile(file)})`, { weight })
        .load()
        .then((face) => {
          document.fonts.add(face);
        })
        .catch(() => console.warn(`[fonts] ${file} not found; using fallback fonts.`)),
    ),
  ).finally(() => continueRender(handle));
};
