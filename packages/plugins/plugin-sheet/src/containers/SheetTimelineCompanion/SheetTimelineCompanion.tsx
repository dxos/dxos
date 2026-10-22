//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { useSelection } from '@dxos/react-ui-attention';

import { ComputeGraphContextProvider, TimelineCompanion, useComputeGraph, useRangeValues } from '#components';
import { type Sheet, SheetCapabilities } from '#types';

import { type SheetModel, useSheetModel } from '../../model/index.ts';

export type SheetTimelineCompanionProps = {
  role?: string;
  subject: Sheet.Sheet;
};

/** A timeline of a range of the sheet, kept on the sheet; new timelines start from the sheet's selection. */
export const SheetTimelineCompanion = ({ subject }: SheetTimelineCompanionProps) => {
  const registry = Hooks.useCapability(SheetCapabilities.ComputeGraphRegistry);
  const space = getSpace(subject);
  if (!space) {
    return null;
  }

  return (
    <ComputeGraphContextProvider registry={registry}>
      <SheetTimelineCompanionInner sheet={subject} space={space} />
    </ComputeGraphContextProvider>
  );
};

SheetTimelineCompanion.displayName = 'SheetTimelineCompanion';

const SheetTimelineCompanionInner = ({ sheet, space }: { sheet: Sheet.Sheet; space: Space }) => {
  const graph = useComputeGraph(space);
  const model = useSheetModel(graph, sheet);
  return model ? <SheetTimeline sheet={sheet} model={model} /> : null;
};

const SheetTimeline = ({ sheet: sheetProp, model }: { sheet: Sheet.Sheet; model: SheetModel }) => {
  const [sheet, updateSheet] = useObject(sheetProp);
  const getValues = useRangeValues(model);
  const selection = useSelection(Obj.getURI(sheetProp), 'range');

  const handleChange = useCallback(
    (timeline: Sheet.Timeline | undefined) =>
      updateSheet((sheet) => {
        // The schema type's arrays are read-only; the object takes a mutable copy.
        sheet.timeline = timeline && { ...timeline, hidden: timeline.hidden && [...timeline.hidden] };
      }),
    [updateSheet],
  );

  return (
    <TimelineCompanion
      timeline={sheet.timeline}
      onChange={handleChange}
      getValues={getValues}
      selection={selection && (selection.from === selection.to ? selection.from : `${selection.from}:${selection.to}`)}
    />
  );
};
