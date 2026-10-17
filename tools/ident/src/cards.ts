//
// Copyright 2026 DXOS.org
//

// The idents as components, without `index.ts`'s `registerRoot`, so a Remotion `Player` can play them elsewhere
// (autocue's storybook bookends a take with them, as `trim-static.mjs --ident` does with the rendered clips).

export { COLORS, FPS, TIMING } from './brand.ts';
export { EndCard, OpenTitle } from './components.tsx';
export { ComposerIntro } from './ComposerIntro.tsx';
export { loadBrandFont } from './fonts.ts';
