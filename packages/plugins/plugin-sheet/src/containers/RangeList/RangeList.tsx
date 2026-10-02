//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

// Loaded only through the lazy `RangeList` container, so Next's CSS stays out of the boot graph.
import '@dxos/react-ui/theme.css';
import { rangeToA1Notation } from '@dxos/compute-hyperformula';
import { useObject } from '@dxos/echo-react';
import { Next, useTranslation } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { type Sheet, SheetUtil } from '#types';

/** A sheet toggles a `key`/`value` on a cell range at most once, so the triple identifies a range. */
const getRangeId = ({ key, value, range }: Sheet.Range) => `${key}:${value}:${range}`;

export type RangeListProps = {
  sheet: Sheet.Sheet;
};

/** The sheet's formatting ranges in precedence order (later ranges win), each removable. */
export const RangeList = ({ sheet: sheetProp }: RangeListProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [sheet, updateSheet] = useObject(sheetProp);

  // The row's text, also its typeahead label.
  const getLabel = useCallback(
    (range: Sheet.Range) =>
      t('range.title', {
        position: rangeToA1Notation(SheetUtil.rangeFromIndex(sheetProp, range.range)),
        key: t(`range-key.${range.key}.label`),
        value: t(`range-value.${range.value}.label`),
      }),
    [t, sheetProp],
  );

  const handleDelete = useCallback(
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
    <>
      <Next.Label>{t('range-list.heading')}</Next.Label>
      {sheet.ranges.length === 0 ? (
        <Next.Banner.Root>
          <Next.Banner.Title>{t('no-ranges.message')}</Next.Banner.Title>
        </Next.Banner.Root>
      ) : (
        <OrderedList.Root<Sheet.Range> items={sheet.ranges} getId={getRangeId} getLabel={getLabel}>
          {({ items: ranges }) => (
            <OrderedList.Content aria-label={t('range-list.heading')} scroll={false}>
              {ranges.map((range) => {
                const id = getRangeId(range);
                return (
                  <OrderedList.Item key={id} id={id}>
                    <OrderedList.ItemText />
                    <Next.SystemButton.Remove onClick={() => handleDelete(id)} />
                  </OrderedList.Item>
                );
              })}
            </OrderedList.Content>
          )}
        </OrderedList.Root>
      )}
    </>
  );
};

RangeList.displayName = 'RangeList';
