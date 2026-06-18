//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.outliner',
    name: 'Outliner',
    description: trim`
      Tree-structured note-taking editor for organizing ideas hierarchically.
      Each Outline is backed by an ECHO CRDT Text object so edits merge automatically across peers in real time.
      Indent and outdent list items with Tab / Shift-Tab, use hashtags for inline tagging, and delete items via the editor context menu.

      The plugin also provides a Journal — a date-keyed collection of entries where each day's notes are an independent outline.
      A collapsible calendar sidebar lets you navigate between dates, and the journal auto-creates today's entry on first focus.
      Entries render newest-first in a scrollable list so recent notes are always at hand.

      A Quick Journal Entry dialog (accessible as a global operation) lets you append a checkbox bullet to today's entry without leaving your current context.
      Invoking the operation from an AI blueprint or keyboard shortcut creates the Journal and today's entry automatically if they do not yet exist.
    `,
    icon: { key: 'ph--tree-structure--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-outliner',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
