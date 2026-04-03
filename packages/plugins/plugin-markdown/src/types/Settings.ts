//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EditorInputMode, EditorViewMode } from '@dxos/ui-editor/types';

/**
 * Plugin settings.
 */
export const MarkdownSettingsSchema = Schema.mutable(
  Schema.Struct({
    defaultViewMode: EditorViewMode,
    editorInputMode: Schema.optional(EditorInputMode),
    experimental: Schema.optional(Schema.Boolean),
    debug: Schema.optional(Schema.Boolean),
    toolbar: Schema.optional(Schema.Boolean),
    typewriter: Schema.optional(Schema.String),
    // TODO(burdon): Per document settings.
    numberedHeadings: Schema.optional(Schema.Boolean),
    folding: Schema.optional(Schema.Boolean),
  }),
);

export type MarkdownSettingsProps = Schema.Schema.Type<typeof MarkdownSettingsSchema>;
