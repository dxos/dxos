//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createIntent, useCapability, Capabilities } from '@dxos/app-framework';
import { inRange } from '@dxos/compute';
import { ThreadAction } from '@dxos/plugin-thread/types';
import type { MenuAction, MenuActionHandler } from '@dxos/react-ui-menu';

import { type AlignAction } from './align';
import { type CommentAction } from './comment';
import { type StyleAction } from './style';
import { type ToolbarState } from './useToolbarState';
import { completeCellRangeToThreadCursor } from '../../integrations';
import { alignKey, rangeFromIndex, rangeToIndex } from '../../types';
import { useSheetContext } from '../SheetContext';

export type ToolbarAction = StyleAction | AlignAction | CommentAction;

export const useToolbarAction = (state: ToolbarState) => {
  const { model, cursorFallbackRange, cursor } = useSheetContext();
  const { dispatchPromise: dispatch } = useCapability(Capabilities.IntentDispatcher);

  // TODO(Zan): Externalize the toolbar action handler. E.g., Toolbar/keys should both fire events.
  return useCallback(
    (action: MenuAction<ToolbarAction>) => {
      const { key, value } = action.properties;
      if (cursorFallbackRange) {
        const index =
          model.sheet.ranges?.findIndex(
            (range) => range.key === key && inRange(rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
          ) ?? -1;
        const nextRangeEntity = {
          range: rangeToIndex(model.sheet, cursorFallbackRange),
          key,
          value,
        };
        switch (key) {
          case 'alignment':
            if (index < 0) {
              model.sheet.ranges?.push(nextRangeEntity);
              state[alignKey] = value;
            } else if (model.sheet.ranges![index].value === value) {
              model.sheet.ranges?.splice(index, 1);
              state[alignKey] = undefined;
            } else {
              model.sheet.ranges?.splice(index, 1, nextRangeEntity);
              state[alignKey] = value;
            }
            break;
          case 'style':
            if (
              model.sheet.ranges
                .filter(
                  ({ range, key: rangeKey }) =>
                    rangeKey === 'style' && inRange(rangeFromIndex(model.sheet, range), cursorFallbackRange.from),
                )
                .some(({ value: rangeValue }) => rangeValue === value)
            ) {
              // this value should be unset
              if (index >= 0) {
                model.sheet.ranges?.splice(index, 1);
              }
              state[value] = false;
            } else {
              model.sheet.ranges?.push(nextRangeEntity);
              state[value] = true;
            }
            break;
          case 'comment': {
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
  ) as MenuActionHandler;
};
