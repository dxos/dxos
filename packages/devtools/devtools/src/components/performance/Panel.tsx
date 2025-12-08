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
  maxHeight?: number;
  open?: boolean;
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
  maxHeight = 240,
  open = true,
  onToggle,
}: PropsWithChildren<PanelProps>) => {
  return (
    <div className='flex flex-col overflow-hidden'>
      <div
        className='flex items-center justify-between pli-2 text-sm text-fine cursor-pointer'
        onClick={() => onToggle?.(id, !open)}
      >
        <div className='flex items-center gap-2 plb-1'>
          <Icon icon={icon} />
          <span className='truncate'>{title}</span>
        </div>
        {info}
      </div>
      {children && (
        <div
          style={{ maxHeight: open ? (maxHeight ? `${maxHeight}px` : undefined) : 0 }}
          className={mx(
            'flex flex-col is-full transition-all duration-200 ease-in-out',
            maxHeight ? 'overflow-y-auto' : 'bs-full overflow-hidden',
            padding && 'pli-2',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
