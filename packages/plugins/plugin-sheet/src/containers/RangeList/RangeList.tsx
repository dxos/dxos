//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { rangeToA1Notation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { rangeFromIndex } from '../../types';
import { Sheet } from '../../types';

export type RangeListProps = {
  sheet: Sheet.Sheet;
};

export const RangeList = ({ sheet }: RangeListProps) => {
  const { t } = useTranslation(meta.id);
  // TODO(thure): Implement similar to comments, #8121
  const handleSelectRange = (range: Sheet.Range) => {};
  const handleDeleteRange = useCallback(
    (range: Sheet.Range) => {
      const index = sheet.ranges.findIndex((sheetRange) => sheetRange === range);
      Obj.change(sheet, (obj) => {
        obj.ranges.splice(index, 1);
      });
    },
    [sheet],
  );
  return (
    <>
      <Input.Root>
        <Input.Label>{t('range list heading')}</Input.Label>
      </Input.Root>
      {sheet.ranges.length < 1 ? (
        <Message.Root>
          <Message.Title>{t('no ranges message')}</Message.Title>
        </Message.Root>
      ) : (
        <List.Root<Sheet.Range> items={sheet.ranges} isItem={Schema.is(Sheet.Range)}>
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
      )}
    </>
  );
};
