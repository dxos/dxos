//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { S } from '@dxos/echo-schema';
import { useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover } from '@dxos/react-ui-theme';

import { rangeFromIndex, rangeToA1Notation } from '../../defs';
import { SHEET_PLUGIN } from '../../meta';
import { Range, type SheetType } from '../../types';

export type RangeListProps = {
  sheet: SheetType;
};

export const RangeList = ({ sheet }: RangeListProps) => {
  const { t } = useTranslation(SHEET_PLUGIN);
  // TODO(thure): Implement similar to comments, #8121
  const handleSelectRange = (range: Range) => {};
  const handleDeleteRange = useCallback(
    (range: Range) => {
      const index = sheet.ranges.findIndex((sheetRange) => sheetRange === range);
      sheet.ranges.splice(index, 1);
    },
    [sheet],
  );
  return (
    <>
      <h2 className='p-2 text-sm font-semibold'>{t('range list heading')}</h2>
      <List.Root<Range> items={sheet.ranges} isItem={S.is(Range)}>
        {({ items: ranges }) =>
          ranges.map((range, i) => (
            <List.Item key={i} item={range} classNames={['p-2', ghostHover]}>
              <List.ItemDragHandle />
              <List.ItemTitle onClick={() => handleSelectRange(range)}>
                {t('range title', {
                  position: rangeToA1Notation(rangeFromIndex(sheet, range.range)),
                  key: t(`range key ${range.key} label`),
                  value: t(`range value ${range.value} label`),
                })}
              </List.ItemTitle>
              <List.ItemDeleteButton onClick={() => handleDeleteRange(range)} />
            </List.Item>
          ))
        }
      </List.Root>
    </>
  );
};
