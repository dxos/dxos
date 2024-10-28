//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';
import { ghostHover } from '@dxos/react-ui-theme';
import { List } from '@dxos/react-ui-list';

import { rangeFromIndex, rangeToA1Notation } from '../../defs';
import { Range, type SheetType } from '../../types';

export type RangeListProps = {
  sheet: SheetType;
  onSelect?: (range: Range) => void;
  onDelete?: (range: Range) => void;
};

export const RangeList = ({ sheet, onSelect, onDelete }: RangeListProps) => {
  return (
    <div className='flex flex-col'>
      <List.Root<Range> items={sheet.ranges} isItem={S.is(Range)}>
        {({ items }) =>
          items.map((item, i) => (
            <List.Item key={i} item={item} classNames={['p-2', ghostHover]}>
              <List.ItemTitle onClick={() => onSelect?.(item)}>{rangeToA1Notation(rangeFromIndex(sheet, item.range))}</List.ItemTitle>
              {onDelete &&
                <List.ItemDeleteButton onClick={() => onDelete(item)} />
              }
            </List.Item>
          ))
        }
      </List.Root>
    </div>
  );
};
