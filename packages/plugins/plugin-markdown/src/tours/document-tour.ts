//
// Copyright 2026 DXOS.org
//

import type * as Tour from '@dxos/app-toolkit/Tour';

/** Walks the editor's toolbar controls. */
export const steps: Tour.Step[] = [
  {
    target: '[data-testid="editor.toolbar.strong"]',
    title: 'Markdown, formatted as you type',
    description: 'Write Markdown directly, or use these for headings, emphasis, lists and links.',
    placement: 'bottom',
  },
  {
    target: '[data-testid="editor.toolbar.search"]',
    title: 'Search',
    description: 'Find and replace within the document.',
    placement: 'bottom',
  },
  {
    target: '[data-testid="editor.toolbar.viewMode"]',
    title: 'Modes',
    description: 'Switch between the source, a rendered preview, and read-only.',
    placement: 'bottom-end',
  },
];

export default steps;
