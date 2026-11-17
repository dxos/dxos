//
// Copyright 2026 DXOS.org
//

//
// The Composer slide: the window a person works in, with the plugin behind each of its panes named on either side.
//

import { type SlideSpec } from './spec.ts';
import { type StudioModel, studioComponentData } from './studio.ts';

const plugin = (id: string, label: string, icon: string, body: string, footer: string, iconTone: string) => ({
  id,
  label,
  icon,
  body,
  footer,
  iconTone,
});

export const composerSpec = (model: StudioModel): SlideSpec => ({
  id: 'composer',
  title: 'Composer',
  metrics: { cardWidth: 336, bodyCardHeight: 160, rowGap: 48, columnGap: 96, groupGap: 96 },
  groups: [
    {
      id: 'left',
      columns: [
        [
          plugin(
            'navtree',
            'Navtree',
            'tree-view',
            'The space tree in the sidebar, built from the app graph.',
            'plugin-navtree',
            'var(--t-event)',
          ),
          plugin(
            'document',
            'Document',
            'file-text',
            'Collaborative markdown; the text lives in ECHO.',
            'plugin-markdown',
            'var(--t-trip)',
          ),
          plugin(
            'sheet',
            'Sheet',
            'grid-four',
            'A spreadsheet embedded in the document.',
            'plugin-sheet',
            'var(--t-sheet)',
          ),
        ],
      ],
    },
    {
      id: 'app',
      columns: [[{ id: 'frame', component: 'app-frame', ...studioComponentData(model, 'frame') }]],
    },
    {
      id: 'right',
      columns: [
        [
          plugin(
            'assistant',
            'Assistant',
            'sparkle',
            'Assistant chat about the object on screen.',
            'plugin-assistant',
            'var(--t-message)',
          ),
          plugin(
            'canvas',
            'Canvas',
            'pen-nib',
            'A diagram embedded in the document.',
            'plugin-excalidraw',
            'var(--t-file)',
          ),
        ],
      ],
    },
  ],
  // Each plugin's wire ends on the pane it draws, which the frame keeps as geometry of its own.
  edges: [
    { from: 'navtree', to: 'frame/r-nav', tap: true },
    { from: 'document', to: 'frame/r-doc', tap: true },
    { from: 'sheet', to: 'frame/r-sheet', tap: true },
    { from: 'assistant', to: 'frame/r-comp', tap: true },
    { from: 'canvas', to: 'frame/r-canvas', tap: true },
  ],
});
