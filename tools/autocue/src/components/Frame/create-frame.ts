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

/**
 * The caption's style: `band` spans the frame's width at its edge; `panel` floats over the content, centred and as
 * wide as its text. The header is always a band; its only floating form is the intro.
 */
export type BandStyle = 'band' | 'panel';

export type FrameOptions = {
  /**
   * `overlay` fixes the header and caption over the page; `layout` lays them over the host's children (through a
   * `<slot>`). Either way the recording fills the whole frame and every band or panel lies over it, translucent.
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
  /** The caption's style; defaults to `panel`. */
  captionStyle?: BandStyle;
  /** On, the header's text also shows as a translucent band over the top; defaults to off (no panels). */
  headerBand?: boolean;
  /** Milliseconds to hold the header as a centred panel when the frame opens (see `playIntro`); 0 or unset skips it. */
  intro?: number;
};

export type FrameSize = {
  width: number;
  height: number;
};

export type FrameHandle = {
  setHeader: (text?: FrameText) => void;
  setCaption: (text?: FrameText) => void;
  setSize: (size?: FrameSize) => void;
  setCaptionStyle: (style: BandStyle) => void;
  setHeaderBand: (show: boolean) => void;
  /**
   * Shows the header's text alone, as a panel centred in the frame, for `ms`; then fades it out as the header and
   * caption fade in. Resolves once the hand-off is done; a later call or `dispose` cuts it short.
   */
  playIntro: (ms?: number) => Promise<void>;
  dispose: () => void;
};

export const FRAME_STYLES = `
  ${TOKENS}
  .frame { box-sizing: border-box; font-family: var(--autocue-font); }
  /* Overlay leaves the host's own content laid out as if the frame were not there. */
  .stage.overlay, .frame.overlay, .frame.overlay .content { display: contents; }
  .stage.layout { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--autocue-letterbox); }
  .frame.layout { position: relative; width: 100%; height: 100%; }
  /* Centred, then scaled about its centre by \`--autocue-scale\`, which the host's resize observer sets. */
  .frame.layout.sized { position: absolute; left: 50%; top: 50%; transform-origin: center;
    transform: translate(-50%, -50%) scale(var(--autocue-scale, 1)); }
  /* The recording always fills the frame; nothing below takes space from it. */
  .frame.layout .content { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
  .header.off { display: none; }
  /* Only the bands ignore the pointer: inherited through the slot, it would disable the content too. */
  .band { box-sizing: border-box; text-align: center; pointer-events: none; backdrop-filter: blur(6px);
    background: var(--autocue-band-surface); color: var(--autocue-band-fg); }
  .band[hidden] { display: none; }
  /* Raised: the content is positioned too, and would otherwise paint over a band that precedes it. */
  .band:not(.panel) { position: absolute; z-index: 1; left: 0; right: 0; }
  .frame.overlay .band:not(.panel) { position: fixed; z-index: var(--autocue-layer); }
  .header:not(.panel) { top: 0; }
  .caption:not(.panel) { bottom: 0; }
  .panel { position: absolute; z-index: 1; left: 50%; transform: translateX(-50%); width: max-content; max-width: 80%;
    border-radius: var(--autocue-panel-radius); box-shadow: var(--autocue-panel-shadow);
    --autocue-band-surface: var(--autocue-panel-surface); --autocue-band-fg: var(--autocue-panel-fg);
    --autocue-band-muted: var(--autocue-panel-muted); }
  .frame.overlay .panel { position: fixed; z-index: var(--autocue-layer); }
  .header { padding: 16px 24px; }
  .header .title { font: 600 30px/1.2 var(--autocue-font); }
  .header .subtitle { font: 400 18px/1.35 var(--autocue-font); margin-top: 4px; color: var(--autocue-band-muted); }
  /* A fixed height, so a caption with or without a subtitle never moves. */
  .caption { height: var(--autocue-caption-height); padding: 0 24px; display: flex; flex-direction: column;
    justify-content: center; }
  .caption.panel { bottom: var(--autocue-panel-inset); padding: 0 28px;
    --autocue-band-surface: var(--autocue-caption-surface); backdrop-filter: blur(6px); }
  .caption .title, .caption .subtitle, .panel .title, .panel .subtitle { white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; }
  .caption .title { font: 600 26px/1.3 var(--autocue-font); }
  .caption .subtitle { font: 400 19px/1.35 var(--autocue-font); margin-top: 4px; color: var(--autocue-band-muted); }
  /* The opening title: the header's text, larger, centred in the frame, alone; the header and caption fade in as it
     fades out. */
  .header, .intro { transition: opacity var(--autocue-intro-fade) ease; }
  /* Each caption fades out before the next fades in, so a step change reads as a cut between lines: a panel fades
     whole, while a band stays up and only its text fades. */
  .caption, .caption > * { transition: opacity var(--autocue-caption-fade) ease; }
  .caption:not(.panel)[hidden] { display: flex; }
  .held, .caption.panel.fading, .caption:not(.panel).fading > *, .intro.out { opacity: 0; }
  .header.panel.intro { top: 50%; transform: translate(-50%, -50%); padding: 24px 48px; }
  .intro .title { font-size: 48px; }
  .intro .subtitle { font-size: 24px; margin-top: 8px; }
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
  {
    mode = 'overlay',
    header,
    caption,
    size,
    captionStyle = 'panel',
    headerBand: showHeaderBand = false,
    intro,
  }: FrameOptions = {},
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
  // Hidden until a caption arrives: the first \`setCaption\` with nothing to show is a no-op.
  captionBand.hidden = true;
  captionBand.dataset.testid = 'autocue-frame-caption';

  const content = document.createElement('div');
  content.className = 'content';
  content.appendChild(document.createElement('slot'));

  const introBand = document.createElement('div');
  introBand.className = 'band header panel intro';
  introBand.dataset.testid = 'autocue-frame-intro';
  introBand.hidden = true;

  frame.append(headerBand, content, captionBand, introBand);

  const stage = document.createElement('div');
  stage.className = `stage ${mode}`;
  stage.appendChild(frame);

  root.append(style, stage);
  let headerText = header;
  const setHeader = (text?: FrameText) => {
    headerText = text;
    renderBand(headerBand, text);
  };
  setHeader(header);

  /** Milliseconds from a `--autocue-*` duration token, read when used so a host's override applies. */
  const duration = (token: string) => parseFloat(getComputedStyle(frame).getPropertyValue(token)) || 0;

  let captionText: FrameText | undefined;
  let captionTimer: ReturnType<typeof setTimeout> | undefined;
  const setCaption = (text?: FrameText) => {
    if (text?.title === captionText?.title && text?.subtitle === captionText?.subtitle) {
      return;
    }

    clearTimeout(captionTimer);
    const showing = Boolean(captionText?.title);
    captionText = text;
    const show = () => {
      renderBand(captionBand, text);
      if (text?.title) {
        // Commit the transparent start state, then fade in.
        captionBand.classList.add('fading');
        void captionBand.offsetHeight;
        captionBand.classList.remove('fading');
      }
    };
    if (showing) {
      captionBand.classList.add('fading');
      captionTimer = setTimeout(show, duration('--autocue-caption-fade'));
    } else {
      show();
    }
  };
  setCaption(caption);

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

  const setCaptionStyle = (style: BandStyle) => {
    captionBand.classList.toggle('panel', style === 'panel');
  };
  setCaptionStyle(captionStyle);

  const setHeaderBand = (show: boolean) => {
    headerBand.classList.toggle('off', !show);
  };
  setHeaderBand(showHeaderBand);

  let cancelIntro = () => {};
  // The title opens alone: the header and caption wait for it.
  const held = [headerBand, captionBand];
  const release = () => held.forEach((band) => band.classList.remove('held'));
  const playIntro = (ms = 3_000) => {
    cancelIntro();
    if (!headerText?.title) {
      return Promise.resolve();
    }

    const fade = duration('--autocue-intro-fade');
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => {
      timers.forEach(clearTimeout);
      introBand.hidden = true;
      introBand.classList.remove('out');
      release();
    };

    // The header leaves at once and the intro fades in from transparent: the reflow commits each start state.
    renderBand(introBand, headerText);
    introBand.classList.add('out');
    for (const band of held) {
      band.style.transition = 'none';
      band.classList.add('held');
    }
    void frame.offsetHeight;
    for (const band of held) {
      band.style.transition = '';
    }
    introBand.classList.remove('out');
    return new Promise<void>((resolve) => {
      cancelIntro = () => {
        finish();
        resolve();
      };
      timers.push(
        setTimeout(() => {
          introBand.classList.add('out');
          release();
        }, ms),
        setTimeout(() => cancelIntro(), ms + fade),
      );
    });
  };
  if (intro) {
    void playIntro(intro);
  }

  return {
    setHeader,
    setCaption,
    setSize,
    setCaptionStyle,
    setHeaderBand,
    playIntro,
    dispose: () => {
      clearTimeout(captionTimer);
      cancelIntro();
      observer.disconnect();
      style.remove();
      stage.remove();
    },
  };
};
