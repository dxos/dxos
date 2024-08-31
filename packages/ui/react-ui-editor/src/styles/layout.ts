//
// Copyright 2024 DXOS.org
//

/**
 * CodeMirror root scroller.
 * This must be added to the editor slots.
 */
export const editorScroller =
  '[&>.cm-scroller]:mli-auto [&>.cm-scroller]:w-full [&>.cm-scroller]:max-w-[min(60rem,100%-4rem)]';

export const editorWithToolbarLayout =
  'grid grid-cols-1 grid-rows-[min-content_1fr] data-[toolbar=disabled]:grid-rows-[1fr] justify-center content-start overflow-hidden';
