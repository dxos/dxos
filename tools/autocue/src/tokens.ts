//
// Copyright 2026 DXOS.org
//

/**
 * Custom properties every autocue component reads. They are declared on `:host` so a host page (or a React
 * wrapper) can override them from outside the shadow root, which is the one thing that crosses it.
 * The defaults are the dark band the driver has always drawn over recordings.
 */
export const TOKENS = `
  :host {
    --autocue-font: ui-sans-serif, system-ui, sans-serif;
    --autocue-band-surface: rgba(17, 17, 17, 0.92);
    --autocue-band-fg: #fff;
    --autocue-band-muted: rgba(255, 255, 255, 0.7);
    --autocue-layer: 2147483647;
  }
`;
