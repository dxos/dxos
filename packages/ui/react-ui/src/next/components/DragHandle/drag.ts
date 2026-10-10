//
// Copyright 2026 DXOS.org
//

import { type Size, SIZES } from '../../sizes.ts';

const ANNOUNCER_ID = 'dx-drag-announcer';

/**
 * Speaks `message` through one polite live region shared by every drag handle, created on first use at the end of the
 * body, so announcing adds no element (and no grid track) beside the handle.
 */
export const announce = (doc: Document, message: string) => {
  let region = doc.getElementById(ANNOUNCER_ID);
  if (!region) {
    region = doc.createElement('div');
    region.id = ANNOUNCER_ID;
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.className = 'sr-only';
    doc.body.append(region);
  }
  region.textContent = message;
};

/**
 * The size and level a drag preview needs to look like its source row once portalled out of the row's scope (AUDIT
 * 2.6): the `data-size` and `data-surface` of the source's nearest ancestors that set them (attribute reads, no layout).
 */
export const dragScope = (source: HTMLElement | null | undefined) => {
  const size = source?.closest('[data-size]')?.getAttribute('data-size');
  return {
    size: SIZES.find((candidate): candidate is Size => candidate === size),
    surface: source?.closest('[data-surface]:not([data-surface="bar"])')?.getAttribute('data-surface') ?? undefined,
  };
};
