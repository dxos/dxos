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
    /* Translucent: a band lies over the recording, never beside it. */
    --autocue-band-surface: rgba(17, 17, 17, 0.72);
    --autocue-band-fg: #fff;
    --autocue-band-muted: #b3b3b3;
    --autocue-layer: 2147483647;
    /* Fits a title and a subtitle line with the padding the driver's banner always had. */
    --autocue-caption-height: 104px;
    --autocue-panel-inset: 24px;
    --autocue-panel-radius: 12px;
    /* The void around the frame: mid grey (Tailwind neutral-400) in light, so the recording's own edges read; black in
       dark. The ident player uses the same values. */
    --autocue-letterbox: oklch(70.8% 0 0);
    /* Read by script as milliseconds, so keep the unit. */
    --autocue-open-fade: 600ms;
    --autocue-caption-fade: 300ms;
    --autocue-panel-surface: rgba(17, 17, 17, 0.92);
    /* Final Cut Pro's caption: white bold type on translucent black, the same in both themes. Only the background is
       translucent (the frame's \`captionBackground\`); the title and subtitle share one solid text colour. */
    --autocue-caption-rgb: 0, 0, 0;
    --autocue-caption-alpha: 0.6;
    --autocue-caption-blur: 8px;
    --autocue-caption-fg: #fff;
    --autocue-caption-font: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    --autocue-caption-radius: 14px;
    --autocue-caption-inset: 56px;
    --autocue-panel-fg: #fff;
    --autocue-panel-muted: #b3b3b3;
    --autocue-panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  :host-context(.dark) {
    --autocue-letterbox: #000;
    --autocue-panel-surface: rgba(250, 250, 250, 0.95);
    --autocue-panel-fg: #111;
    --autocue-panel-muted: #646464;
    --autocue-panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  }
`;
