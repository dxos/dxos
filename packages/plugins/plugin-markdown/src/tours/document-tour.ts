//
// Copyright 2026 DXOS.org
//

import * as Tour from '@dxos/app-toolkit/Tour';

export const steps: Tour.Step[] = [
  Tour.toolbarStep('editor.toolbar.strong', {
    title: 'Markdown, formatted as you type',
    description: 'Write Markdown directly, or use these for headings, emphasis, lists and links.',
    placement: 'bottom',
  }),
  Tour.toolbarStep('editor.toolbar.search', {
    title: 'Search',
    description: 'Find and replace within the document.',
    placement: 'bottom',
  }),
  Tour.toolbarStep('editor.toolbar.viewMode', {
    title: 'Modes',
    description: 'Switch between the source, a rendered preview, and read-only.',
    placement: 'bottom-end',
  }),
];

export default steps;
