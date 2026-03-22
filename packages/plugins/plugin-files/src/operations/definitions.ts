//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';

const FILES_OPERATION = `${meta.id}.operation`;

export const SelectRoot = Operation.make({
  meta: { key: `${FILES_OPERATION}.select-root`, name: 'Select Root Directory' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const Export = Operation.make({
  meta: { key: `${FILES_OPERATION}.export`, name: 'Export Files' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const Import = Operation.make({
  meta: { key: `${FILES_OPERATION}.import`, name: 'Import Files' },
  services: [Capability.Service],
  input: Schema.Struct({ rootDir: Schema.optional(Schema.String) }),
  output: Schema.Void,
});

export const OpenFile = Operation.make({
  meta: { key: `${FILES_OPERATION}.open-file`, name: 'Open File' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Struct({ id: Schema.String, subject: Schema.Array(Schema.String) }),
});

export const OpenDirectory = Operation.make({
  meta: { key: `${FILES_OPERATION}.open-directory`, name: 'Open Directory' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Struct({ id: Schema.String, subject: Schema.Array(Schema.String) }),
});

export const Reconnect = Operation.make({
  meta: { key: `${FILES_OPERATION}.reconnect`, name: 'Reconnect File' },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});

export const Close = Operation.make({
  meta: { key: `${FILES_OPERATION}.close`, name: 'Close File' },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});

export const Save = Operation.make({
  meta: { key: `${FILES_OPERATION}.save`, name: 'Save File' },
  services: [Capability.Service],
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
});
