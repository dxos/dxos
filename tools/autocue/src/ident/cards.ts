//
// Copyright 2026 DXOS.org
//

// The idents as components, without `index.ts`'s `registerRoot`, so a Remotion `Player` can play them elsewhere
// (the Ident and Frame stories play them, as `trim-static.mjs --ident` bookends a take with the rendered clips).

export { type FormatId, FORMATS, FPS, SPOT_SECONDS, TIMING } from './brand.ts';
export { ComposerIntro } from './ComposerIntro.tsx';
export { loadBrandFont } from './fonts.ts';
export { PROVOCATIONS } from './provocations.ts';
export { EndOnly, OpenOnly, Spot10, Spot30 } from './Spots.tsx';
export { type IdentProps, type IdentTheme, TAILWIND_COLOR_NAMES, palette, tailwindColor } from './theme.tsx';
export { Trail } from './Trail.tsx';
