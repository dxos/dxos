//
// Copyright 2026 DXOS.org
//

/**
 * Custom properties every autocue component reads. They are declared on `:host` so a host page (or a React
 * wrapper) can override them from outside the shadow root, which is the one thing that crosses it.
 * Bands are always the dark band the driver has drawn over recordings; panels invert the page's theme, which
 * Composer marks with `html.dark`, so a floating panel stands out from the content beneath it.
 */
export const TOKENS = `
  :host {
    --autocue-font: ui-sans-serif, system-ui, sans-serif;
    --autocue-band-surface: rgba(17, 17, 17, 0.92);
    --autocue-band-fg: #fff;
    --autocue-band-muted: rgba(255, 255, 255, 0.7);
    --autocue-layer: 2147483647;
    /* Fits a title and a subtitle line with the padding the driver's banner always had. */
    --autocue-caption-height: 88px;
    --autocue-panel-inset: 24px;
    --autocue-panel-radius: 12px;
    --autocue-letterbox: #000;
    /* Read by script as milliseconds, so keep the unit. */
    --autocue-intro-fade: 600ms;
    --autocue-caption-fade: 300ms;
    --autocue-panel-surface: rgba(17, 17, 17, 0.92);
    /* The caption panel lets the app show through a little, since it sits over the content for the whole take. */
    --autocue-caption-surface: rgba(17, 17, 17, 0.78);
    --autocue-panel-fg: #fff;
    --autocue-panel-muted: rgba(255, 255, 255, 0.7);
    --autocue-panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  :host-context(.dark) {
    --autocue-panel-surface: rgba(250, 250, 250, 0.95);
    --autocue-caption-surface: rgba(250, 250, 250, 0.8);
    --autocue-panel-fg: #111;
    --autocue-panel-muted: rgba(17, 17, 17, 0.65);
    --autocue-panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  }
`;
