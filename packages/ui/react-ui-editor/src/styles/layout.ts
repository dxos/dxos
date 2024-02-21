//
// Copyright 2024 DXOS.org
//

export const editorWithToolbarLayout =
  'grid grid-cols-1 grid-rows-[min-content_1fr] data-[toolbar=disabled]:grid-rows-[1fr] justify-center content-start overflow-hidden';

export const editorFillLayoutRoot = 'bs-full overflow-hidden grid';
export const editorFillLayoutEditor =
  'bs-full overflow-hidden [&>.cm-scroller]:bs-full [&>.cm-scroller]:overflow-y-auto';

export const editorHalfViewportOverscrollContent = 'after:block after:min-bs-[50dvh] after:pointer-events-none';
