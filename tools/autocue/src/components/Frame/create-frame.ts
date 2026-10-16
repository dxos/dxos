//
// Copyright 2026 DXOS.org
//

// No React and no runtime imports beyond `tokens.ts`: autocue's driver bundles this file on its own and injects it
// into any page it records. `Frame` wraps it for React.

import { TOKENS } from '../../tokens.ts';

export type FrameText = {
  title: string;
  subtitle?: string;
};

export type FrameMode = 'overlay' | 'layout';

/** `band` spans the frame's width at its edge; `panel` floats over the content, centred and as wide as its text. */
export type BandStyle = 'band' | 'panel';

export type FrameOptions = {
  /**
   * `overlay` fixes the header and caption over the page, so the recorded app shows through.
   * `layout` stacks a `band` header and caption around the content (the host's children, through a `<slot>`); a
   * `panel` floats over the content instead, which then fills that side of the frame.
   */
  mode?: FrameMode;
  header?: FrameText;
  caption?: FrameText;
  /**
   * Layout only: the recording's size in pixels. The frame lays out at exactly this size and scales to fit the host,
   * letterboxed, so text wraps and bands sit where they will in the video whatever the host's shape.
   * Unset, the frame fills the host.
   */
  size?: FrameSize;
  /** Defaults to `band`. */
  headerStyle?: BandStyle;
  /** Defaults to `panel`. */
  captionStyle?: BandStyle;
};

export type FrameSize = {
  width: number;
  height: number;
};

export type FrameHandle = {
  setHeader: (text?: FrameText) => void;
  setCaption: (text?: FrameText) => void;
  setSize: (size?: FrameSize) => void;
  setStyles: (styles: { header?: BandStyle; caption?: BandStyle }) => void;
  dispose: () => void;
};

export const FRAME_STYLES = `
  ${TOKENS}
  .frame { box-sizing: border-box; font-family: var(--autocue-font); }
  /* Overlay leaves the host's own content laid out as if the frame were not there. */
  .stage.overlay, .frame.overlay, .frame.overlay .content { display: contents; }
  .stage.layout { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--autocue-letterbox); }
  .frame.layout { position: relative; display: flex; flex-direction: column; width: 100%; height: 100%; }
  /* Centred, then scaled about its centre by \`--autocue-scale\`, which the host's resize observer sets. */
  .frame.layout.sized { position: absolute; left: 50%; top: 50%; transform-origin: center;
    transform: translate(-50%, -50%) scale(var(--autocue-scale, 1)); }
  .frame.layout .content { flex: 1; min-height: 0; position: relative; display: flex; flex-direction: column; }
  /* Only the bands ignore the pointer: inherited through the slot, it would disable the content too. */
  .band { flex: none; box-sizing: border-box; text-align: center; pointer-events: none;
    background: var(--autocue-band-surface); color: var(--autocue-band-fg); }
  .band[hidden] { display: none; }
  .frame.overlay .band:not(.panel) { position: fixed; left: 0; right: 0; z-index: var(--autocue-layer); }
  .frame.overlay .header:not(.panel) { top: 0; }
  .frame.overlay .caption:not(.panel) { bottom: 0; }
  /* A full-width caption keeps its space while empty, so the content never resizes between steps. */
  .frame.layout .caption:not(.panel)[hidden] { display: flex; }
  /* Raised: the content is positioned too, and would otherwise paint over a panel that precedes it. */
  .panel { position: absolute; z-index: 1; left: 50%; transform: translateX(-50%); width: max-content; max-width: 80%;
    border-radius: var(--autocue-panel-radius); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); }
  .frame.overlay .panel { position: fixed; z-index: var(--autocue-layer); }
  .header { padding: 16px 24px; }
  .header.panel { top: var(--autocue-panel-inset); padding: 12px 28px; }
  .header .title { font: 600 30px/1.2 var(--autocue-font); }
  .header .subtitle { font: 400 18px/1.35 var(--autocue-font); margin-top: 4px; color: var(--autocue-band-muted); }
  /* A fixed height, so a caption with or without a subtitle never moves. */
  .caption { height: var(--autocue-caption-height); padding: 0 24px; display: flex; flex-direction: column;
    justify-content: center; }
  .caption.panel { bottom: var(--autocue-panel-inset); padding: 0 28px; }
  .caption .title, .caption .subtitle, .panel .title, .panel .subtitle { white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; }
  .caption .title { font: 600 20px/1.35 var(--autocue-font); }
  .caption .subtitle { font: 400 15px/1.35 var(--autocue-font); margin-top: 4px; color: var(--autocue-band-muted); }
`;

const renderBand = (band: HTMLElement, text?: FrameText) => {
  band.replaceChildren();
  band.hidden = !text?.title;
  if (!text?.title) {
    return;
  }

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = text.title;
  band.appendChild(title);
  if (text.subtitle) {
    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = text.subtitle;
    band.appendChild(subtitle);
  }
};

/**
 * The frame around a recording: a title band at the top and a caption band at the bottom, either over the page
 * (`overlay`) or around the host's own content (`layout`). A band with no title is not drawn.
 */
export const createFrame = (
  root: ShadowRoot,
  { mode = 'overlay', header, caption, size, headerStyle = 'band', captionStyle = 'panel' }: FrameOptions = {},
): FrameHandle => {
  const style = document.createElement('style');
  style.textContent = FRAME_STYLES;

  const frame = document.createElement('div');
  frame.className = `frame ${mode}`;
  frame.dataset.testid = 'autocue-frame';

  const headerBand = document.createElement('div');
  headerBand.className = 'band header';
  headerBand.dataset.testid = 'autocue-frame-header';

  const captionBand = document.createElement('div');
  captionBand.className = 'band caption';
  captionBand.dataset.testid = 'autocue-frame-caption';

  const content = document.createElement('div');
  content.className = 'content';
  content.appendChild(document.createElement('slot'));

  frame.append(headerBand, content, captionBand);

  const stage = document.createElement('div');
  stage.className = `stage ${mode}`;
  stage.appendChild(frame);

  root.append(style, stage);
  renderBand(headerBand, header);
  renderBand(captionBand, caption);

  let current: FrameSize | undefined;
  const fit = () => {
    if (!current) {
      return;
    }
    const { width, height } = stage.getBoundingClientRect();
    frame.style.setProperty('--autocue-scale', String(Math.min(width / current.width, height / current.height)));
  };

  // Overlay paints over a live page at its real size, so only layout scales.
  const observer = new ResizeObserver(fit);
  const setSize = (next?: FrameSize) => {
    current = mode === 'layout' ? next : undefined;
    frame.classList.toggle('sized', Boolean(current));
    frame.style.width = current ? `${current.width}px` : '';
    frame.style.height = current ? `${current.height}px` : '';
    if (current) {
      observer.observe(stage);
      fit();
    } else {
      observer.disconnect();
      frame.style.removeProperty('--autocue-scale');
    }
  };
  setSize(size);

  const setStyles: FrameHandle['setStyles'] = ({ header, caption }) => {
    if (header) {
      headerBand.classList.toggle('panel', header === 'panel');
    }
    if (caption) {
      captionBand.classList.toggle('panel', caption === 'panel');
    }
  };
  setStyles({ header: headerStyle, caption: captionStyle });

  return {
    setHeader: (text) => renderBand(headerBand, text),
    setCaption: (text) => renderBand(captionBand, text),
    setSize,
    setStyles,
    dispose: () => {
      observer.disconnect();
      style.remove();
      stage.remove();
    },
  };
};
