//
// Copyright 2023 DXOS.org
//

import { Play, X, CaretDoubleLeft, CaretDoubleRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { type FC, useEffect } from 'react';

import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { useControlledValue } from '../../util';

export type PagerProps = {
  index?: number;
  count?: number;
  keys?: boolean; // TODO(burdon): Rename.
  onChange?: (index: number) => void;
  onExit?: () => void;
};

export const Pager = ({ index: controlledIndex = 0, count = 0, keys, onChange, onExit }: PagerProps) => {
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
      <Button variant='ghost' classNames='p-0' onClick={() => onChange?.(0)}>
        <CaretDoubleLeft className={mx(getSize(6))} />
      </Button>
      <Button variant='ghost' classNames='p-0' onClick={() => handleChangeIndex(-1)}>
        <CaretLeft className={mx(getSize(6))} />
      </Button>
      <Button variant='ghost' classNames='p-0' onClick={() => handleChangeIndex(1)}>
        <CaretRight className={mx(getSize(6))} />
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
    <div className='flex items-center text-neutral-500 text-2xl'>
      <div>
        {index + 1} / {count}
      </div>
    </div>
  );
};

export const StartButton: FC<{ running?: boolean; onClick?: (start: boolean) => void }> = ({ running, onClick }) => {
  return (
    <Button variant='ghost' classNames='p-0' onClick={() => onClick?.(!running)}>
      {(running && <X className={mx(getSize(6))} />) || <Play className={mx(getSize(6))} />}
    </Button>
  );
};
