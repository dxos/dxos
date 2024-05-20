//
// Copyright 2024 DXOS.org
//

import { type Icon } from '@phosphor-icons/react';
import React, { type PropsWithChildren } from 'react';

import { getSize, mx } from '@dxos/react-ui-theme';

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
        className={mx(
          'flex items-center justify-between px-3 text-sm text-fine cursor-pointer',
          'bg-neutral-100 dark:bg-neutral-850 text-black dark:text-neutral-200',
        )}
        onClick={() => onToggle?.(id, !open)}
      >
        <div className='flex items-center gap-2 py-1'>
          <Icon className={getSize(4)} />
          <span>{title}</span>
        </div>
        {info}
      </div>
      {children && (
        <div
          className={mx(
            'flex w-full overflow-x-hidden overflow-y-scroll transition-max-height max-h-[240px]',
            'bg-white dark:bg-neutral-900 text-black dark:text-neutral-300',
            open ? 'border-t border-neutral-200 dark:border-neutral-800' : 'max-h-0',
            padding && 'px-2',
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
