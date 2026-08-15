//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { rangeToA1Notation } from '@dxos/compute-hyperformula';
import { useObject } from '@dxos/echo-react';
import { Banner, Flex, Input, useTranslation } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { Sheet, SheetUtil } from '#types';

export type RangeListProps = {
  sheet: Sheet.Sheet;
};

export const RangeList = ({ sheet: sheetProp }: RangeListProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [sheet, updateSheet] = useObject(sheetProp);
  // TODO(thure): Implement similar to comments, #8121
  const handleSelectRange = (range: Sheet.Range) => {};
  const handleDeleteRange = useCallback(
    (range: Sheet.Range) => {
      const index = sheet.ranges.findIndex((sheetRange) => sheetRange === range);
      updateSheet((sheet) => {
        sheet.ranges.splice(index, 1);
      });
    },
    [sheet, updateSheet],
  );
  return (
    <>
      <Input.Root>
        <Input.Label>{t('range-list.heading')}</Input.Label>
      </Input.Root>
      {sheet.ranges.length === 0 ? (
        <Banner.Root>
          <Banner.Content>
            <Banner.Title>{t('no-ranges.message')}</Banner.Title>
          </Banner.Content>
        </Banner.Root>
      ) : (
        <OrderedList.Root<Sheet.Range> items={sheet.ranges} isItem={Schema.is(Sheet.Range)}>
          {({ items: ranges }) => (
            <OrderedList.Content>
              {ranges.map((range) => {
                // Use the range's underlying cell range string as the stable id so deletes /
                // re-renders don't shift row identity by array position. Reorder is not
                // wired (DX-8121); add `OrderedList.DragHandle` + a real id strategy when it
                // lands. We avoid `OrderedList.Title` because there's no disclosure panel
                // for it to control here.
                const id = range.range;
                return (
                  <OrderedList.Item
                    key={id}
                    id={id}
                    item={range}
                    hover
                    classNames='flex items-center cursor-pointer'
                    onClick={() => handleSelectRange(range)}
                  >
                    <Flex align='center' classNames='grow truncate px-2'>
                      {t('range.title', {
                        position: rangeToA1Notation(SheetUtil.rangeFromIndex(sheetProp, range.range)),
                        key: t(`range-key.${range.key}.label`),
                        value: t(`range-value.${range.value}.label`),
                      })}
                    </Flex>
                    <OrderedList.DeleteButton onClick={() => handleDeleteRange(range)} />
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
