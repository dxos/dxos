//
// Copyright 2024 DXOS.org
//

/**
 * CodeMirror content width.
 * 40rem = 640px. Corresponds to initial plank width (Google docs, Stashpad, etc.)
 * 50rem = 800px. Maximum content width for solo mode.
 */
// TODO(burdon): Consider gutters.
export const editorContent = '!mli-auto w-full max-w-[min(50rem,100%-4rem)]';

export const editorWithToolbarLayout =
  'grid grid-cols-1 grid-rows-[min-content_1fr] data-[toolbar=disabled]:grid-rows-[1fr] justify-center content-start overflow-hidden';
