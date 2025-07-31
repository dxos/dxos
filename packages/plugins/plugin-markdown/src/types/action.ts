//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { EditorViewMode } from '@dxos/react-ui-editor/types';

import { Document } from './markdown';
import { meta } from '../meta';

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    spaceId: Type.SpaceId,
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
