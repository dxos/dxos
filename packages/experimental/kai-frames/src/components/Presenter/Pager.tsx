//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, CaretDoubleRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

export type PagerProps = {
  index?: number;
  count?: number;
  keys?: boolean;
  onMove?: (index: number) => void;
  onClose?: () => void;
};

export const Pager = ({ index: controlledIndex = 0, count = 0, keys, onMove, onClose }: PagerProps) => {
  const [index, setIndex] = useState(controlledIndex);
  useEffect(() => {
    setIndex(controlledIndex);
  }, [controlledIndex]);
  useEffect(() => {
    onMove?.(index);
  }, [index]);

  const handleMove = (dir: number) => {
    setIndex((index) => {
      const next = index + dir;
      return next >= 1 && next <= count ? next : index;
    });
  };

  useEffect(() => {
    // TODO(burdon): Esc.
    const handler = (event: KeyboardEvent) => {
      if (!keys) {
        return;
      }

      switch (event.key) {
        case 'Escape': {
          onClose?.();
          break;
        }
        case 'ArrowLeft': {
          if (event.shiftKey) {
            onMove?.(1);
          } else {
            handleMove(-1);
          }
          break;
        }
        case 'ArrowRight': {
          if (event.shiftKey) {
            onMove?.(count);
          } else {
            handleMove(1);
          }
          break;
        }
        case 'ArrowUp': {
          onMove?.(1);
          break;
        }
        case 'ArrowDown': {
          onMove?.(count);
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keys, count]);

  if (!index || !count) {
    return null;
  }

  return (
    <div className='flex m-4 items-center text-gray-400'>
      <Button variant='ghost' classNames='p-0' onClick={() => onMove?.(1)}>
        <CaretDoubleLeft className={mx(getSize(6))} />
      </Button>
      <Button variant='ghost' classNames='p-0' onClick={() => handleMove(-1)}>
        <CaretLeft className={mx(getSize(8))} />
      </Button>
      <Button variant='ghost' classNames='p-0' onClick={() => handleMove(1)}>
        <CaretRight className={mx(getSize(8))} />
      </Button>
      <Button variant='ghost' classNames='p-0' onClick={() => onMove?.(count)}>
        <CaretDoubleRight className={mx(getSize(6))} />
      </Button>
    </div>
  );
};

export type PageNumberProps = {
  index?: number;
  count?: number;
};

export const PageNumber = ({ index = 1, count = 1 }: PageNumberProps) => {
  if (!index || !count) {
    return null;
  }

  return (
    <div className='flex m-4 items-center text-gray-400 text-2xl'>
      <div>
        {index} / {count}
      </div>
    </div>
  );
};
