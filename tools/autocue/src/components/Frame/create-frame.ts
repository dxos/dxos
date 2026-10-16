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

export type FrameOptions = {
  /**
   * `overlay` fixes the bands over the page and leaves the middle empty, so the recorded app shows through.
   * `layout` stacks header, content (the host's children, through a `<slot>`) and caption in a column.
   */
  mode?: FrameMode;
  header?: FrameText;
  caption?: FrameText;
};

export type FrameHandle = {
  setHeader: (text?: FrameText) => void;
  setCaption: (text?: FrameText) => void;
  dispose: () => void;
};

export const FRAME_STYLES = `
  ${TOKENS}
  .frame { box-sizing: border-box; font-family: var(--autocue-font); pointer-events: none; }
  .frame.layout { display: flex; flex-direction: column; width: 100%; height: 100%; }
  .frame.layout .content { flex: 1; min-height: 0; position: relative; display: flex; flex-direction: column; }
  .frame.overlay .band { position: fixed; left: 0; right: 0; z-index: var(--autocue-layer); }
  .frame.overlay .header { top: 0; }
  .frame.overlay .caption { bottom: 0; }
  .band { flex: none; box-sizing: border-box; text-align: center;
    background: var(--autocue-band-surface); color: var(--autocue-band-fg); }
  .band[hidden] { display: none; }
  .header { padding: 16px 24px; }
  .header .title { font: 600 30px/1.2 var(--autocue-font); }
  .header .subtitle { font: 400 18px/1.35 var(--autocue-font); margin-top: 4px; color: var(--autocue-band-muted); }
  .caption { padding: 16px 24px 18px; }
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
  { mode = 'overlay', header, caption }: FrameOptions = {},
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

  frame.appendChild(headerBand);
  if (mode === 'layout') {
    const content = document.createElement('div');
    content.className = 'content';
    content.appendChild(document.createElement('slot'));
    frame.appendChild(content);
  }
  frame.appendChild(captionBand);

  root.append(style, frame);
  renderBand(headerBand, header);
  renderBand(captionBand, caption);

  return {
    setHeader: (text) => renderBand(headerBand, text),
    setCaption: (text) => renderBand(captionBand, text),
    dispose: () => {
      style.remove();
      frame.remove();
    },
  };
};
