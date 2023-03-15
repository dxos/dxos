//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, CaretDoubleRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import { Button, getSize, mx } from '@dxos/react-components';

export type PagerProps = {
  index?: number;
  count?: number;
  onMove?: (index: number) => void;
};

export const Pager = ({ index = 0, count = 0, onMove }: PagerProps) => {
  const handleMove = (direction: number) => {
    const next = index + direction;
    if (next > 0 && next <= count) {
      onMove?.(next);
    }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft': {
          handleMove(-1);
          break;
        }
        case 'ArrowRight': {
          handleMove(1);
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
  });

  if (!index || !count) {
    return null;
  }

  return (
    <div className='flex m-4 items-center text-gray-400'>
      <Button variant='ghost' className='p-0' onClick={() => onMove?.(1)}>
        <CaretDoubleLeft className={mx(getSize(6))} />
      </Button>
      <Button variant='ghost' className='p-0' onClick={() => handleMove(-1)}>
        <CaretLeft className={mx(getSize(8))} />
      </Button>
      <Button variant='ghost' className='p-0' onClick={() => handleMove(1)}>
        <CaretRight className={mx(getSize(8))} />
      </Button>
      <Button variant='ghost' className='p-0' onClick={() => onMove?.(count)}>
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
