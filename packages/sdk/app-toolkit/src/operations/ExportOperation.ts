//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

/**
 * Print an object through the browser's print dialog (which also saves it as PDF).
 * Handled for any object whose type contributes an `AppCapabilities.Exporter` with `print`.
 */
export const Print = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.print'),
    name: 'Print',
    description: 'Print an object, or save it as PDF.',
    icon: 'ph--printer--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Any,
  }),
  output: Schema.Void,
});

/**
 * Save an object to a file in its type's native format.
 * Handled for any object whose type contributes an `AppCapabilities.Exporter` with `save`.
 */
export const Save = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.save'),
    name: 'Save',
    description: 'Save an object to a file.',
    icon: 'ph--download-simple--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Any,
  }),
  output: Schema.Void,
});
