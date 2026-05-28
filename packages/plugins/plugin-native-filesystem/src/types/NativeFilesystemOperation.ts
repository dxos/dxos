//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${DXN.getName(meta.id)}.operation.${name}`);

export const OpenDirectory = Operation.make({
  meta: {
    key: makeKey('openDirectory'),
    name: 'Open Folder',
    icon: 'ph--folder-open--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Union(Schema.Void, Schema.Struct({ id: Schema.String, subject: Schema.Array(Schema.String) })),
});

export const CloseDirectory = Operation.make({
  meta: { key: makeKey('closeDirectory'), name: 'Close Folder', icon: 'ph--folder--regular' },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});

export const RefreshDirectory = Operation.make({
  meta: {
    key: makeKey('refreshDirectory'),
    name: 'Refresh Folder',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});
