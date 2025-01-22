//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { inRange } from '@dxos/compute';
import { ThreadAction } from '@dxos/plugin-thread/types';
import type { MenuAction, MenuActionHandler } from '@dxos/react-ui-menu';

import { type AlignAction } from './align';
import { type CommentAction } from './comment';
import { type StyleAction } from './style';
import { completeCellRangeToThreadCursor } from '../../integrations';
import { rangeFromIndex, rangeToIndex } from '../../types';
import { useSheetContext } from '../SheetContext';

export type ToolbarAction = StyleAction | AlignAction | CommentAction;

export type ToolbarActionType = ToolbarAction['key'];

export type ToolbarActionHandler = MenuActionHandler;

export const useToolbarAction = () => {
  const { model, cursorFallbackRange, cursor } = useSheetContext();
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  // TODO(Zan): Externalize the toolbar action handler. E.g., Toolbar/keys should both fire events.
  return useCallback(
    (action: MenuAction<ToolbarAction>) => {
      const { key, value } = action.properties;
      switch (key) {
        case 'alignment':
          if (cursorFallbackRange) {
            const index =
              model.sheet.ranges?.findIndex(
                (range) =>
                  range.key === key && inRange(rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
              ) ?? -1;
            const nextRangeEntity = {
              range: rangeToIndex(model.sheet, cursorFallbackRange),
              key,
              value,
            };
            if (index < 0) {
              model.sheet.ranges?.push(nextRangeEntity);
            } else if (model.sheet.ranges![index].value === value) {
              model.sheet.ranges?.splice(index, 1);
            } else {
              model.sheet.ranges?.splice(index, 1, nextRangeEntity);
            }
          }
          break;
        case 'style':
          if (
            cursorFallbackRange &&
            model.sheet.ranges
              .filter(
                ({ range, key: rangeKey }) =>
                  rangeKey === 'style' && inRange(rangeFromIndex(model.sheet, range), cursorFallbackRange.from),
              )
              .some(({ value: rangeValue }) => rangeValue === value)
          ) {
            // this value should be unset
            const index = model.sheet.ranges?.findIndex(
              (range) =>
                range.key === key &&
                cursorFallbackRange &&
                inRange(rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
            );
            if (index >= 0) {
              model.sheet.ranges?.splice(index, 1);
            }
          } else if (cursorFallbackRange) {
            model.sheet.ranges?.push({
              range: rangeToIndex(model.sheet, cursorFallbackRange),
              key,
              value,
            });
          }
          break;
        case 'comment': {
          if (cursorFallbackRange) {
            const cellContent = model.getCellText(cursorFallbackRange.from);
            void dispatch(
              createIntent(ThreadAction.Create, {
                cursor: completeCellRangeToThreadCursor(cursorFallbackRange),
                name: cellContent,
                subject: model.sheet,
              }),
            );
          }
        }
      }
    },
    [model.sheet, cursorFallbackRange, cursor, dispatch],
  );
};
