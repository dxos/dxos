//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';
import { EditorViewMode } from '@dxos/ui-editor/types';

import { meta } from '../meta';

import { Document } from './Markdown';

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Document,
  }),
}) {}

export class SetViewMode extends Schema.TaggedClass<SetViewMode>()(`${meta.id}/action/set-view-mode`, {
  input: Schema.Struct({
    id: Schema.String,
    viewMode: EditorViewMode,
  }),
  output: Schema.Void,
}) {}

const MARKDOWN_OPERATION = `${meta.id}/operation`;

export namespace MarkdownOperation {
  export const Create = Operation.make({
    meta: { key: `${MARKDOWN_OPERATION}/create`, name: 'Create Markdown Document' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
        content: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Document,
      }),
    },
  });

  export const SetViewMode = Operation.make({
    meta: { key: `${MARKDOWN_OPERATION}/set-view-mode`, name: 'Set View Mode' },
    schema: {
      input: Schema.Struct({
        id: Schema.String,
        viewMode: EditorViewMode,
      }),
      output: Schema.Void,
    },
  });
}
