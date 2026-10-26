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
    <Layout.Flex align='center' classNames='text-description select-none'>
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
  // Wide enough for the last page (tabular digits are 1ch, and 3ch covers ` / `), so moving from page 9 to 10 does not
  // widen the pager; one text node, so the label still reads (and is found) as `9 / 10`.
  const width = `${String(count).length * 2 + 3}ch`;
  return (
    <Layout.Flex align='center' classNames='text-description text-2xl tabular-nums select-none'>
      <div className='text-end' style={{ minWidth: width }}>
        {count === 0 ? 0 : index + 1} / {count}
      </div>
    </Layout.Flex>
  );
};

export type ExitButtonProps = {
  onExit: () => void;
};

/** Ends the pager row: leaves fullscreen. */
export const ExitButton = ({ onExit }: ExitButtonProps) => (
  <Button.Root
    data-testid='presenter.pager.exit'
    icon='ph--x--regular'
    iconSize='xl'
    label='Exit'
    iconOnly
    showTooltip={false}
    variant='ghost'
    classNames='p-0 text-description'
    onClick={onExit}
  />
);
