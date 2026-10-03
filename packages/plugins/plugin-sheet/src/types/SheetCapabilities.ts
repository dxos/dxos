//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { type ComputeGraphRegistry as ComputeGraphRegistryType } from '@dxos/compute-hyperformula';
import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid';

import { meta } from '#meta';

import * as Sheet from './Sheet.ts';

export type GridEntry = { grid: DxGridElement; setActiveRefs: (refs: GridContentProps['activeRefs']) => void };

export type GridRegistry = {
  register: (attendableId: string, grid: DxGridElement, setActiveRefs: GridEntry['setActiveRefs']) => void;
  unregister: (attendableId: string) => void;
  get: (attendableId: string) => GridEntry | undefined;
};

export const ComputeGraphRegistry = Capability.makeSingleton<ComputeGraphRegistryType>()(
  `${meta.profile.key}.capability.computeGraphRegistry`,
);

/** Registry of active grid instances keyed by attendable ID. */
export const GridInstances = Capability.makeSingleton<GridRegistry>()(`${meta.profile.key}.capability.gridInstances`);

// TODO(wittjosiah): Factor out. This is `DxGridAxis` from `@dxos/react-ui-grid`.
const ActionAxis = Schema.Union([Schema.Literal('row'), Schema.Literal('col')]);

export namespace SheetAction {
  export const RestoreAxis = Schema.Struct({
    axis: ActionAxis,
    axisIndex: Schema.String,
    index: Schema.Number,
    axisMeta: Sheet.RowColumnMeta,
    values: Schema.Array(Schema.Any),
  });

  export type RestoreAxis = Schema.Schema.Type<typeof RestoreAxis>;
}
