//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { EditorInputMode, EditorViewMode } from '@dxos/ui-editor/types';

/**
 * Plugin settings.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    defaultViewMode: EditorViewMode.annotations({
      title: 'Default view mode',
      description: 'Set whether documents open in editing or read-only mode.',
    }),
    editorInputMode: Schema.optional(
      EditorInputMode.annotations({
        title: 'Editor input mode',
        description: 'Choose keyboard bindings for the editor.',
      }),
    ),
    toolbar: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Show toolbar',
        description: 'Display a formatting toolbar above the editor.',
      }),
    ),
    numberedHeadings: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Numbered headings',
        description: 'Automatically number heading levels in the document.',
      }),
    ),
    folding: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Folding',
        description: 'Allow collapsing and expanding sections by heading.',
      }),
    ),
    experimental: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Enable experimental features',
        description: 'Turn on features that are still in development.',
      }),
    ),
    debug: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Enable debugging features',
        description: 'Show developer tools and diagnostics for the editor.',
      }),
    ),
    typewriter: Schema.optional(
      Schema.String.annotations({
        title: 'Typewriter script',
        description: 'Script to replay typed input for testing purposes.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
