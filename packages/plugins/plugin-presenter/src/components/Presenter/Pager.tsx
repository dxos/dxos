//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

export type PagerProps = {
  index?: number;
  count?: number;
  keys?: boolean; // TODO(burdon): Rename.
  onChange?: (index: number) => void;
  onExit?: () => void;
};

export const Pager = ({ index: indexProp = 0, count = 0, keys, onChange, onExit }: PagerProps) => {
  const [index, setIndex] = Hooks.useControlledState(indexProp);
  useEffect(() => {
    onChange?.(index);
  }, [index]);

  const handleChangeIndex = (dir: number) => {
    setIndex((index) => {
      const next = index + dir;
      return next >= 0 && next < count ? next : index;
    });
  };

  // TODO(burdon): Standardize via system key binding.
  useEffect(() => {
    if (!keys) {
      return;
    }

    const keydownHandler = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape': {
          onExit?.();
          break;
        }
        case 'ArrowLeft': {
          if (event.shiftKey) {
            onChange?.(0);
          } else {
            handleChangeIndex(-1);
          }
          break;
        }
        case 'ArrowRight': {
          if (event.shiftKey) {
            onChange?.(count - 1);
          } else {
            handleChangeIndex(1);
          }
          break;
        }
        case 'ArrowUp': {
          onChange?.(0);
          break;
        }
        case 'ArrowDown': {
          onChange?.(count - 1);
          break;
        }
      }
    };

    window.addEventListener('keydown', keydownHandler);
    return () => window.removeEventListener('keydown', keydownHandler);
  }, [keys, count]);

  if (index === undefined || !count) {
    return null;
  }

  return (
    <div className='flex items-center text-neutral-500'>
      <Button.Button
        icon='ph--caret-double-left--regular'
        iconSize='xl'
        label='Jump to first'
        iconOnly
        showTooltip={false}
        variant='ghost'
        classNames='p-0'
        onClick={() => onChange?.(0)}
      />
      <Button.Button
        icon='ph--caret-left--regular'
        iconSize='xl'
        label='Previous'
        iconOnly
        showTooltip={false}
        variant='ghost'
        classNames='p-0'
        onClick={() => handleChangeIndex(-1)}
      />
      <Button.Button
        icon='ph--caret-right--regular'
        iconSize='xl'
        label='Next'
        iconOnly
        showTooltip={false}
        variant='ghost'
        classNames='p-0'
        onClick={() => handleChangeIndex(1)}
      />
      <Button.Button
        icon='ph--caret-double-right--regular'
        iconSize='xl'
        label='Jump to last'
        iconOnly
        showTooltip={false}
        variant='ghost'
        classNames='p-0'
        onClick={() => onChange?.(count - 1)}
      />
    </div>
  );
};

export type PageNumberProps = {
  index?: number;
  count?: number;
};

export const PageNumber = ({ index = 0, count = 1 }: PageNumberProps) => {
  if (index === undefined || !count) {
    return null;
  }

  return (
    <div className='flex items-center text-neutral-500 text-2xl'>
      <div>
        {index + 1} / {count}
      </div>
    </div>
  );
};

export const StartButton = ({ running, onClick }: { running?: boolean; onClick?: (start: boolean) => void }) => {
  return (
    <Button.Button
      icon={running ? 'ph--x--regular' : 'ph--play--regular'}
      iconSize='xl'
      label={running ? 'Stop' : 'Play'}
      iconOnly
      showTooltip={false}
      variant='ghost'
      classNames='p-0'
      onClick={() => onClick?.(!running)}
    />
  );
};
