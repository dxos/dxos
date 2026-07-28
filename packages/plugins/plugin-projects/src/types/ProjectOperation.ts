//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { Operation, Project } from '@dxos/compute';
import { Database, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

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
