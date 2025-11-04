//
// Copyright 2024 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type PanelProps = {
  className?: string; // TODO(burdon): Change to ThemedClassName.
  id: string;
  icon: string;
  title: string;
  info?: JSX.Element;
  padding?: boolean;
  open?: boolean;
  maxHeight?: boolean;
  onToggle?: (id: string, open: boolean) => void;
};

export type CustomPanelProps<T> = Pick<PanelProps, 'id' | 'open' | 'onToggle'> & T;

export const Panel = ({
  children,
  className,
  id,
  icon,
  title,
  info,
  padding = true,
  open = true,
  maxHeight = true,
  onToggle,
}: PropsWithChildren<PanelProps>) => (
  <div className='flex flex-col'>
    <div
      className='flex items-center justify-between px-2 text-sm text-fine cursor-pointer'
      onClick={() => onToggle?.(id, !open)}
    >
      <div className='flex items-center gap-2 py-1'>
        <Icon icon={icon} size={4} />
        <span className='truncate'>{title}</span>
      </div>
      {info}
    </div>
    {children && (
      <div
        className={mx(
          'flex w-full overflow-x-hidden overflow-y-scroll transition-max-height',
          maxHeight && 'max-h-[240px]',
          !open && 'max-h-0',
          padding && 'px-2',
          className,
        )}
      >
        {children}
      </div>
    )}
  </div>
);
