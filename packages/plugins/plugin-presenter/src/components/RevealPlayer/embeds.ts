//
// Copyright 2026 DXOS.org
//

/** An object embedded in the markdown as `![label](echo:…)`. */
export type SlideEmbed = { uri: string; label: string };

export const EMBED_CLASS = 'dx-slide-embed';

/** An image whose URL is an object URI; its label may carry an editor height after `|`. */
const EMBED_PATTERN = /!\[([^\]]*)\]\(((?:echo|eid):[^)\s]+)\)/g;

const escapeAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replaces each embedded object with an empty block that React renders the object into. */
export const markEmbeds = (content: string) =>
  content.replace(
    EMBED_PATTERN,
    (_, label: string, uri: string) =>
      `<div class="${EMBED_CLASS}" data-uri="${escapeAttribute(uri)}" data-label="${escapeAttribute(label.split('|')[0].trim())}"></div>`,
  );

export type EmbedTarget = SlideEmbed & { element: HTMLElement };

export const findEmbeds = (slides: HTMLElement): EmbedTarget[] =>
  [...slides.querySelectorAll<HTMLElement>(`.${EMBED_CLASS}`)].map((element) => ({
    element,
    uri: element.dataset.uri ?? '',
    label: element.dataset.label ?? '',
  }));
