//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

// Loaded only through the lazy `RangeList` container, so Next's CSS stays out of the boot graph.
import '@dxos/react-ui/next/theme.css';
import { rangeToA1Notation } from '@dxos/compute-hyperformula';
import { useObject } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list/next';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { type Sheet, SheetUtil } from '#types';

/** A sheet toggles a `key`/`value` on a cell range at most once, so the triple identifies a range across reorders. */
const getRangeId = ({ key, value, range }: Sheet.Range) => `${key}:${value}:${range}`;

export type RangeListProps = {
  sheet: Sheet.Sheet;
};

/** The sheet's formatting ranges in precedence order (later ranges win); rows reorder and remove. */
export const RangeList = ({ sheet: sheetProp }: RangeListProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [sheet, updateSheet] = useObject(sheetProp);

  const handleMove = useCallback(
    (from: number, to: number) =>
      updateSheet((sheet) => {
        const [range] = sheet.ranges.splice(from, 1);
        // Re-inserting the detached element would re-parent a removed node; insert a copy of its fields.
        sheet.ranges.splice(to, 0, { range: range.range, key: range.key, value: range.value });
      }),
    [updateSheet],
  );

  // The row's text, also its typeahead and drag-preview label.
  const getLabel = useCallback(
    (range: Sheet.Range) =>
      t('range.title', {
        position: rangeToA1Notation(SheetUtil.rangeFromIndex(sheetProp, range.range)),
        key: t(`range-key.${range.key}.label`),
        value: t(`range-value.${range.value}.label`),
      }),
    [t, sheetProp],
  );

  const handleRemove = useCallback(
    (id: string) =>
      updateSheet((sheet) => {
        const index = sheet.ranges.findIndex((range) => getRangeId(range) === id);
        if (index >= 0) {
          sheet.ranges.splice(index, 1);
        }
      }),
    [updateSheet],
  );

  return (
    <OrderedList.Root<Sheet.Range> items={sheet.ranges} getId={getRangeId} getLabel={getLabel} onMove={handleMove}>
      {({ items: ranges }) => (
        <>
          <OrderedList.Label>{t('range-list.heading')}</OrderedList.Label>
          <OrderedList.Content scroll={false}>
            {ranges.map((range) => {
              const id = getRangeId(range);
              return (
                <OrderedList.Item key={id} id={id}>
                  <OrderedList.DragHandle />
                  <OrderedList.ItemText />
                  <Next.SystemButton.Remove onClick={() => handleRemove(id)} />
                </OrderedList.Item>
              );
            })}
          </OrderedList.Content>
          <OrderedList.Empty>{t('no-ranges.message')}</OrderedList.Empty>
        </>
      )}
    </OrderedList.Root>
  );
};

RangeList.displayName = 'RangeList';
