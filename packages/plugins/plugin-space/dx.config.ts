//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.space',
    name: 'Spaces',
    author: 'DXOS',
    description: trim`
      SpacePlugin is the core workspace container for DXOS Composer. It owns the full lifecycle of
      collaborative spaces — creating, joining, opening, closing, and resetting them — and manages
      the membership and invitation system that controls who can access each space.

      The plugin maintains an ordered app-graph of every space and its collections, wires navigation
      so that opening a space or object updates the layout, and tracks real-time peer presence so
      that the UI can show which collaborators are viewing each object.

      Object and schema management sit at the heart of SpacePlugin: it registers the canonical DXOS
      schema types (Person, Task, Project, Event, …), provides the create-object dialog that all
      other plugins populate with their own types, and exposes operations for adding, removing,
      restoring, duplicating, and serialising objects. Import/export of space archives and schema
      migrations are also handled here.

      A full set of undo-aware operations (RemoveObjects/RestoreObjects, DeleteField/RestoreField)
      integrates with the process manager so that destructive edits can be reversed in one step.
    `,
    icon: { key: 'ph--planet--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
});
