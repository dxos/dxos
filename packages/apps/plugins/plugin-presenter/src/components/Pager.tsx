//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, CaretDoubleRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { useControlledValue } from '../util';

export type PagerProps = {
  index?: number;
  count?: number;
  keys?: boolean;
  onChange?: (index: number) => void;
  onClose?: () => void; // TODO(burdon): Remove.
};

export const Pager = ({ index: controlledIndex = 0, count = 0, keys, onChange, onClose }: PagerProps) => {
  const [index, setIndex] = useControlledValue(controlledIndex);
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
          onClose?.();
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
          onChange?.(1);
          break;
        }
        case 'ArrowDown': {
          onChange?.(count);
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

  // TODO(burdon): Style colors.
  return (
    <div className='flex m-4 items-center text-gray-400'>
      <Button variant='ghost' classNames='p-0' onClick={() => onChange?.(0)}>
        <CaretDoubleLeft className={mx(getSize(6))} />
      </Button>
      <Button variant='ghost' classNames='p-0' onClick={() => handleChangeIndex(-1)}>
        <CaretLeft className={mx(getSize(8))} />
      </Button>
      <Button variant='ghost' classNames='p-0' onClick={() => handleChangeIndex(1)}>
        <CaretRight className={mx(getSize(8))} />
      </Button>
      <Button variant='ghost' classNames='p-0' onClick={() => onChange?.(count - 1)}>
        <CaretDoubleRight className={mx(getSize(6))} />
      </Button>
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
    <div className='flex m-4 items-center text-gray-400 text-2xl'>
      <div>
        {index + 1} / {count}
      </div>
    </div>
  );
};
