//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

// Loaded only through the lazy `RangeList` container, so Next's CSS stays out of the boot graph.
import '@dxos/react-ui/theme.css';
import { rangeToA1Notation } from '@dxos/compute-hyperformula';
import { useObject } from '@dxos/echo-react';
import { OrderedList } from '@dxos/react-ui-list';
import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';
import { type Sheet, SheetUtil } from '#types';

/** A sheet toggles a `key`/`value` on a cell range at most once, so the triple identifies a range. */
const getRangeId = ({ key, value, range }: Sheet.Range) => `${key}:${value}:${range}`;

export type RangeListProps = {
  sheet: Sheet.Sheet;
};

/** The sheet's formatting ranges in precedence order (later ranges win), each removable. */
export const RangeList = ({ sheet: sheetProp }: RangeListProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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
      <Typography.Text>{t('range-list.heading')}</Typography.Text>
      {sheet.ranges.length === 0 ? (
        <Banner.Root>
          <Banner.Title>{t('no-ranges.message')}</Banner.Title>
        </Banner.Root>
      ) : (
        <OrderedList.Root<Sheet.Range> items={sheet.ranges} getId={getRangeId} getLabel={getLabel}>
          {({ items: ranges }) => (
            <OrderedList.Content aria-label={t('range-list.heading')} scroll={false}>
              {ranges.map((range) => {
                const id = getRangeId(range);
                return (
                  <OrderedList.Item key={id} id={id}>
                    <OrderedList.ItemText />
                    <SystemButton.Remove onClick={() => handleDelete(id)} />
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
