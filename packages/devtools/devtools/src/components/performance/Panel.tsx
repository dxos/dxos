//
// Copyright 2024 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { styles } from '../../styles';

export type PanelProps = {
  className?: string; // ThemedClassName
  id: string;
  icon: string;
  title: string;
  info?: JSX.Element;
  padding?: boolean;
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
  open = true,
  onToggle,
}: PropsWithChildren<PanelProps>) => {
  return (
    <div className={mx('flex flex-col', styles.bgPanel)}>
      <div
        className='flex items-center justify-between px-3 text-sm text-fine cursor-pointer'
        onClick={() => onToggle?.(id, !open)}
      >
        <div className='flex items-center gap-2 py-1'>
          <Icon icon={icon} size={4} />
          <span>{title}</span>
        </div>
        {info}
      </div>
      {children && (
        <div
          className={mx(
            'flex w-full overflow-x-hidden overflow-y-scroll transition-max-height max-h-[240px]',
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
};
