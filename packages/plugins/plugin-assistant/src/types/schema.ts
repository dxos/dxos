//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { SpaceSchema, Queue } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';

export const LLM_PROVIDERS = ['edge', 'ollama', 'lmstudio'] as const;

export namespace Assistant {
  //
  // Types
  //

  export const Chat = Schema.Struct({
    id: Type.ObjectId,
    name: Schema.optional(Schema.String),
    queue: Type.Ref(Queue),
  }).pipe(
    Type.Obj({
      typename: 'dxos.org/type/assistant/Chat',
      version: '0.2.0',
    }),
    LabelAnnotation.set(['name']),
  );

  export interface Chat extends Schema.Schema.Type<typeof Chat> {}

  export const CompanionTo = Schema.Struct({
    id: Type.ObjectId,
  }).pipe(
    Type.Relation({
      typename: 'dxos.org/relation/assistant/CompanionTo',
      version: '0.1.0',
      source: Chat,
      target: Type.Expando,
    }),
  );

  export interface CompanionTo extends Schema.Schema.Type<typeof CompanionTo> {}

  //
  // Settings
  //

  export const Settings = Schema.mutable(
    Schema.Struct({
      llmProvider: Schema.optional(Schema.Literal(...LLM_PROVIDERS)),
      edgeModel: Schema.optional(Schema.String),
      ollamaModel: Schema.optional(Schema.String),
      lmstudioModel: Schema.optional(Schema.String),
      customPrompts: Schema.optional(Schema.Boolean),
    }),
  );

  export type Settings = Schema.Schema.Type<typeof Settings>;

  //
  // Actions
  //

  export class OnSpaceCreated extends Schema.TaggedClass<OnSpaceCreated>()(`${meta.id}/on-space-created`, {
    input: Schema.Struct({
      space: SpaceSchema,
      rootCollection: DataType.Collection,
    }),
    output: Schema.Void,
  }) {}

  export class CreateChat extends Schema.TaggedClass<CreateChat>()(`${meta.id}/action/create-chat`, {
    input: Schema.Struct({
      space: SpaceSchema,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Assistant.Chat,
    }),
  }) {}

  export class CreateSequence extends Schema.TaggedClass<CreateSequence>()(`${meta.id}/action/create-sequence`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Sequence,
    }),
  }) {}
}
