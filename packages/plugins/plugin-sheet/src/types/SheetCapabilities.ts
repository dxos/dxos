//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type FC } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { type ComputeGraphRegistry as ComputeGraphRegistryType } from '@dxos/compute-hyperformula';
import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid';
import { type PlotData } from '@dxos/react-ui-plot';

import { SheetNamespace } from '../namespace.ts';
import * as Sheet from './Sheet.ts';

export type GridEntry = {
  sheet: Sheet.Sheet;
  grid: DxGridElement;
  setActiveRefs: (refs: GridContentProps['activeRefs']) => void;
};

export type GridRegistry = {
  register: (attendableId: string, entry: GridEntry) => void;
  unregister: (attendableId: string) => void;
  get: (attendableId: string) => GridEntry | undefined;
};

export const ComputeGraphRegistry = Capability.makeSingleton<ComputeGraphRegistryType>()(
  `${SheetNamespace.key}.capability.computeGraphRegistry`,
);

/** Registry of active grid instances keyed by attendable ID. */
export const GridInstances = Capability.makeSingleton<GridRegistry>()(`${SheetNamespace.key}.capability.gridInstances`);

/** What a contributed chart type draws: the chart's settings and its range's values, header row split off. */
export type ChartTypeProps = {
  chart: Sheet.ChartProperties;
  data: PlotData;
};

/** A chart type another plugin adds to the charts companion. */
export type ChartTypeContribution = {
  /** Stored in a chart's `type`; namespace it (`org.example.sankey`) so it cannot clash with a built-in. */
  type: string;
  /** Shown in the chart-type select and the chart list. */
  label: string;
  /** Phosphor icon name. */
  icon: string;
  component: FC<ChartTypeProps>;
};

export const ChartType = Capability.make<ChartTypeContribution>()(`${SheetNamespace.key}.capability.chartType`);

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
