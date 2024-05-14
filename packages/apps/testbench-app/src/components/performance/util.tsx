//
// Copyright 2024 DXOS.org
//

import { type Icon } from '@phosphor-icons/react';
import React, { type FC, type PropsWithChildren } from 'react';

import { getSize, mx } from '@dxos/react-ui-theme';

const SLOW_TIME = 250;

export const Unit = {
  M: 1_000 * 1_000,
  P: 1 / 100,
  fixed: (n: number, s = 1) => (n / s).toFixed(2),
};

export const Duration: FC<{ duration: number }> = ({ duration }) => (
  <span className={mx(duration > SLOW_TIME && 'text-red-500')}>{Math.floor(duration).toLocaleString()}ms</span>
);

export type PanelProps = {
  id: string;
  icon: Icon;
  title: string;
  info?: JSX.Element;
  padding?: boolean;
  open?: boolean;
  onToggle?: (id: string, open: boolean) => void;
};

export type CustomPanelProps<T> = Pick<PanelProps, 'id' | 'open' | 'onToggle'> & T;

export const Panel = ({
  id,
  icon: Icon,
  title,
  info,
  padding = true,
  open = true,
  onToggle,
  children,
}: PropsWithChildren<PanelProps>) => {
  return (
    <div className='flex flex-col'>
      <div
        className={mx('flex items-center justify-between px-3 cursor-pointer bg-neutral-100 dark:bg-neutral-800')}
        onClick={() => onToggle?.(id, !open)}
      >
        <div className='flex items-center gap-2 py-2'>
          <Icon className={getSize(4)} />
          <span>{title}</span>
        </div>
        {info}
      </div>
      {children && (
        <div
          className={mx(
            'w-full overflow-y-scroll transition-max-height max-h-[240px]',
            open ? '' : 'max-h-0',
            padding && 'px-2',
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
