//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EditorViewMode } from '@dxos/react-ui-editor/types';

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
