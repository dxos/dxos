//
// Copyright 2024 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { Icon, Panel as PanelPrimitive, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type PanelProps = ThemedClassName<{
  id: string;
  icon: string;
  title: string;
  info?: JSX.Element;
  padding?: boolean;
  maxHeight?: number;
  open?: boolean;
  onToggle?: (id: string, open: boolean) => void;
}>;

export type CustomPanelProps<T> = Pick<PanelProps, 'id' | 'open' | 'onToggle'> & T;

export const Panel = ({
  classNames,
  children,
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
    // Collapsible section: auto-height rows so the content can animate closed (the primitive defaults to 1fr content).
    <PanelPrimitive.Root style={{ gridTemplateRows: 'auto auto' }} classNames='shrink-0'>
      {/* Panel.Toolbar's public type omits onClick even though it forwards DOM props at runtime, so the handler lives on an asChild div. */}
      <PanelPrimitive.Toolbar asChild classNames='px-2 text-sm text-fine cursor-pointer'>
        <div
          role='button'
          aria-expanded={open}
          tabIndex={0}
          className='flex items-center justify-between'
          onClick={() => onToggle?.(id, !open)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              if (event.key === ' ') {
                event.preventDefault();
              }
              onToggle?.(id, !open);
            }
          }}
        >
          <div className='flex items-center gap-2 py-1'>
            <Icon icon={icon} />
            <span className='truncate'>{title}</span>
          </div>
          {/* Stop info-control clicks (e.g. the Stats play/pause toggle) from also toggling the panel. */}
          {info && <div onClick={(event) => event.stopPropagation()}>{info}</div>}
        </div>
      </PanelPrimitive.Toolbar>
      {children && (
        <PanelPrimitive.Content
          style={{ maxHeight: open ? (maxHeight ? `${maxHeight}px` : undefined) : 0 }}
          classNames={mx(
            'flex flex-col w-full transition-all duration-200 ease-in-out',
            maxHeight ? 'overflow-y-auto' : 'h-full overflow-hidden',
            padding && 'px-2',
            classNames,
          )}
        >
          {children}
        </PanelPrimitive.Content>
      )}
    </PanelPrimitive.Root>
  );
};
