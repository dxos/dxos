//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { EditorViewMode } from '@dxos/react-ui-editor/types';

import { not_meta } from '../meta';

import { Document } from './Markdown';

export class Create extends Schema.TaggedClass<Create>()(`${not_meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Document,
  }),
}) {}

export class SetViewMode extends Schema.TaggedClass<SetViewMode>()(`${not_meta.id}/action/set-view-mode`, {
  input: Schema.Struct({
    id: Schema.String,
    viewMode: EditorViewMode,
  }),
  output: Schema.Void,
}) {}
