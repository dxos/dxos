//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import { Database, Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Programmatic project creation — the entry point other plugins use to create (and pre-wire)
 * projects without reaching into plugin internals. Resolves the template (blank by default),
 * scaffolds the owned instructions/artifacts graph, and files the project in the Projects section.
 */
export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create Project', icon: 'ph--stack--regular' },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Template id (`ProjectCapabilities.Template`); defaults to the blank template. */
    templateId: Schema.optional(Schema.String),
    /** The object the project is created for (passed to the template's `appliesTo`/`scaffold`). */
    subject: Schema.optional(Obj.Unknown),
  }),
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    project: Type.getSchema(Project.Project),
  }),
});

export const CreateChat = Operation.make({
  meta: { key: makeKey('createChat'), name: 'Create Project Chat', icon: 'ph--chat-text--regular' },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    project: Type.getSchema(Project.Project),
  }),
  output: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
  }),
});

export const CreateRoutine = Operation.make({
  meta: { key: makeKey('createRoutine'), name: 'Create Project Routine', icon: 'ph--lightning--regular' },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    project: Type.getSchema(Project.Project),
  }),
  output: Schema.Struct({
    routine: Type.getSchema(Routine.Routine),
  }),
});
