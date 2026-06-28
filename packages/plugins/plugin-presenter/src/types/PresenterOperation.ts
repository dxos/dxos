//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN, Collection, Type } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const TogglePresentation = Operation.make({
  meta: {
    key: makeKey('togglePresentation'),
    name: 'Toggle Presentation',
    icon: 'ph--presentation--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Schema.Union(Type.getSchema(Markdown.Document), Type.getSchema(Collection.Collection)),
    state: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});
