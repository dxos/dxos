//
// Copyright 2024 DXOS.org
//

import { type Icon } from '@phosphor-icons/react';
import React, { type PropsWithChildren } from 'react';

import { getSize, mx } from '@dxos/react-ui-theme';

import { styles } from '../../styles';

export type PanelProps = {
  id: string;
  icon: Icon;
  title: string;
  info?: JSX.Element;
  padding?: boolean;
  open?: boolean;
  className?: string;
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
  className,
  onToggle,
  children,
}: PropsWithChildren<PanelProps>) => {
  return (
    <div className='flex flex-col'>
      <div
        className={mx('flex items-center justify-between px-3 text-sm text-fine cursor-pointer', styles.bgPanel)}
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
            styles.bgPanel,
            styles.border,
            open ? 'border-t' : 'max-h-0',
            padding && 'px-2',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
