//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';

export type PagerProps = {
  index?: number;
  count?: number;
  onChange?: (index: number) => void;
};

export const Pager = ({ index = 0, count = 0, onChange }: PagerProps) => {
  const handleChangeIndex = (dir: number) => {
    const next = index + dir;
    if (next >= 0 && next < count) {
      onChange?.(next);
    }
  };

  const atStart = count === 0 || index <= 0;
  const atEnd = count === 0 || index >= count - 1;

  return (
    <Layout.Flex align='center' classNames='text-neutral-500 select-none'>
      <Button.Root
        icon='ph--caret-double-left--regular'
        iconSize='xl'
        label='Jump to first'
        disabled={atStart}
        iconOnly
        showTooltip={false}
        variant='ghost'
        classNames='p-0'
        onClick={() => onChange?.(0)}
      />
      <Button.Root
        icon='ph--caret-left--regular'
        iconSize='xl'
        label='Previous'
        disabled={atStart}
        iconOnly
        showTooltip={false}
        variant='ghost'
        classNames='p-0'
        onClick={() => handleChangeIndex(-1)}
      />
      <Button.Root
        icon='ph--caret-right--regular'
        iconSize='xl'
        label='Next'
        disabled={atEnd}
        iconOnly
        showTooltip={false}
        variant='ghost'
        classNames='p-0'
        onClick={() => handleChangeIndex(1)}
      />
      <Button.Root
        icon='ph--caret-double-right--regular'
        iconSize='xl'
        label='Jump to last'
        disabled={atEnd}
        iconOnly
        showTooltip={false}
        variant='ghost'
        classNames='p-0'
        onClick={() => onChange?.(count - 1)}
      />
    </Layout.Flex>
  );
};

export type PageNumberProps = {
  index?: number;
  count?: number;
};

export const PageNumber = ({ index = 0, count = 1 }: PageNumberProps) => {
  return (
    <Layout.Flex align='center' classNames='text-neutral-500 text-2xl tabular-nums select-none'>
      <div>
        {count === 0 ? 0 : index + 1} / {count}
      </div>
    </Layout.Flex>
  );
};
