//
// Copyright 2026 DXOS.org
//

// A UI-free entrypoint. The root barrel pulls the Tailwind class fragments and builds for the
// browser condition, so operation handlers running under node or bun cannot import from it — these
// are plain palette values. Re-exported from the modules that own them rather than moved, so the
// theme keeps a single definition.
// TODO(wittjosiah): Factor these out into a package that does not carry a UI dependency at all.

export { hues } from './defs';
export { type Hue, toHue } from './util/hash-styles';
