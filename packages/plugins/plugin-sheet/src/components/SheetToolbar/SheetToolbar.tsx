//
// Copyright 2024 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import {
  type ActionGraphProps,
  ActionToolbar,
  graphActions,
  isToolbarAction,
  useMenuActions,
} from '@dxos/react-ui-menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Util from '@dxos/react-ui/Util';

import { SheetUtil } from '#types';

import { type Formatting, FormattingToolbar, formattingAt, writeFormatting } from '../FormattingToolbar/index.ts';
import { useSheetContext } from '../SheetRoot/index.ts';

const NO_FORMATTING: Formatting = { styles: [] };

/** The toolbar's own actions are the formatting sections; this graph is empty, so the action toolbar holds only contributed ones. */
const NO_ACTIONS = Atom.make<ActionGraphProps>({ nodes: [], edges: [] });

export type SheetToolbarProps = {};

/**
 * The formatting sections for the selected cells (showing what applies at the cursor), then any toolbar actions other
 * plugins contribute for the sheet.
 */
export const SheetToolbar = Util.composable<HTMLDivElement, SheetToolbarProps>((props, forwardedRef) => {
  const { attendableId, model, cursorFallbackRange } = useSheetContext();
  const [ranges] = useObject(model.sheet, 'ranges');
  const formatting = useMemo(
    () => (cursorFallbackRange ? formattingAt(model.sheet, cursorFallbackRange.from) : NO_FORMATTING),
    [model.sheet, ranges, cursorFallbackRange],
  );

  const handleChange = useCallback(
    (key: string, values: string[], managed?: string[]) => {
      if (cursorFallbackRange) {
        const range = SheetUtil.rangeToIndex(model.sheet, cursorFallbackRange);
        Obj.update(model.sheet, (sheet) => writeFormatting(sheet, range, key, values, managed));
      }
    },
    [model.sheet, cursorFallbackRange],
  );

  const { graph } = Hooks.useAppGraph();
  const customActions = useMemo(
    () => Atom.make((get) => graphActions(graph, get, attendableId, { filter: isToolbarAction })),
    [graph, attendableId],
  );
  const menuActions = useMenuActions(NO_ACTIONS);

  return (
    <div {...Util.composableProps(props, { classNames: 'flex items-center min-w-0' })} ref={forwardedRef}>
      <Toolbar.Root classNames='w-auto shrink-0'>
        <FormattingToolbar
          formatting={formatting}
          onChange={handleChange}
          disabled={!cursorFallbackRange}
          testId='grid.toolbar'
        />
      </Toolbar.Root>
      {/* Contributed actions (e.g. comment) sit at the toolbar's end. */}
      <ActionToolbar
        {...menuActions}
        attendableId={attendableId}
        customActions={customActions}
        classNames='justify-end'
      />
    </div>
  );
});

SheetToolbar.displayName = 'SheetToolbar';
