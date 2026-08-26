//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export const OpenDirectory = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.fileSystem.openDirectory'),
    name: 'Open Folder',
    icon: 'ph--folder-open--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Union([Schema.Void, Schema.Struct({ id: Schema.String, subject: Schema.Array(Schema.String) })]),
});

export const CloseDirectory = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.fileSystem.closeDirectory'),
    name: 'Close Folder',
    icon: 'ph--folder--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});

export const RefreshDirectory = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.fileSystem.refreshDirectory'),
    name: 'Refresh Folder',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});
