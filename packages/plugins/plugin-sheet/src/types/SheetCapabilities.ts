//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type FC } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { type ComputeGraphRegistry as ComputeGraphRegistryType } from '@dxos/compute-hyperformula';
import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid';
import { type PlotData } from '@dxos/react-ui-plot';
import { type Label } from '@dxos/ui-types';

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

/** What a chart type draws: the chart's settings and its range's values, header row split off. */
export type ChartTypeProps = {
  chart: Sheet.ChartProperties;
  data: PlotData;
  /** Shows the chart's own toolbars; off in a slide. */
  chrome?: boolean;
  /** Saves settings changed from the chart's own toolbar; read-only without one. */
  onUpdate?: (props: Partial<Sheet.ChartProperties>) => void;
};

/**
 * A chart type in the charts companion. The sheet contributes its own the same way; another plugin's module
 * activates on `SheetEvents.Start`.
 */
export type ChartTypeContribution = {
  /** Stored in a chart's `type`; another plugin namespaces it (`org.example.sankey`). */
  type: string;
  /** Shown in the chart-type select and the chart list. */
  label: Label;
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
