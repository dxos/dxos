//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { rangeToA1Notation } from '@dxos/compute-hyperformula';
import { useObject } from '@dxos/echo-react';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { rangeFromIndex } from '#types';
import { Sheet } from '#types';

export type RangeListProps = {
  sheet: Sheet.Sheet;
};

export const RangeList = ({ sheet: sheetProp }: RangeListProps) => {
  const { t } = useTranslation(meta.id);
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
      {sheet.ranges.length < 1 ? (
        <Message.Root>
          <Message.Title>{t('no-ranges.message')}</Message.Title>
        </Message.Root>
      ) : (
        <OrderedList.Root<Sheet.Range> items={sheet.ranges} isItem={Schema.is(Sheet.Range)}>
          {({ items: ranges }) => (
            <OrderedList.Content>
              {ranges.map((range, i) => (
                // Reorder is not wired (no `onMove` upstream and ranges lack a stable id),
                // so we omit the drag handle entirely. Add `OrderedList.DragHandle` + a
                // proper `getId` when DX-8121 is implemented.
                <OrderedList.Item
                  key={i}
                  id={String(i)}
                  item={range}
                  hover
                  classNames='flex items-center cursor-pointer'
                  onClick={() => handleSelectRange(range)}
                >
                  <div className='flex grow items-center truncate px-2'>
                    {t('range.title', {
                      position: rangeToA1Notation(rangeFromIndex(sheetProp, range.range)),
                      key: t(`range-key.${range.key}.label`),
                      value: t(`range-value.${range.value}.label`),
                    })}
                  </div>
                  <OrderedList.DeleteButton onClick={() => handleDeleteRange(range)} />
                </OrderedList.Item>
              ))}
            </OrderedList.Content>
          )}
        </OrderedList.Root>
      )}
    </>
  );
};
