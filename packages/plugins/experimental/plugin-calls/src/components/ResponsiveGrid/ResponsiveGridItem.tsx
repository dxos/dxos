//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, type PropsWithChildren } from 'react';

import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ResponsiveGridItemProps<T extends object = any> = PropsWithChildren<
  ThemedClassName<{
    style?: CSSProperties;
    item: T;
    pinned?: boolean;
    name?: string;
    mute?: boolean;
    wave?: boolean;
    speaking?: boolean;
    debug?: boolean;
    onClick?: () => void;
  }>
>;

/**
 * Cell container.
 */
export const ResponsiveGridItem = <T extends object = any>({
  children,
  classNames,
  style,
  name,
  pinned,
  mute,
  wave,
  speaking,
  onClick,
}: ResponsiveGridItemProps<T>) => {
  const hover = mx('transition-opacity duration-300 opacity-0 group-hover:opacity-100');

  return (
    <div className={mx('aspect-video group relative', classNames)} style={style}>
      {children}

      {/* Action. */}
      {onClick && (
        <div className='z-10 absolute top-1 right-1 flex'>
          <IconButton
            classNames={mx('p-1 min-bs-1 rounded', hover)}
            iconOnly
            icon={pinned ? 'ph--x--regular' : 'ph--arrows-out--regular'}
            size={pinned ? 5 : 3}
            label={pinned ? 'Close' : 'Expand'}
            onClick={onClick}
          />
        </div>
      )}

      {/* Name. */}
      {name && (
        <div className='z-10 absolute bottom-1 right-1 flex gap-1 items-center'>
          {wave && !pinned && <Icon icon='ph--hand-waving--duotone' size={5} classNames='animate-pulse text-red-500' />}
          <div className={mx('bg-neutral-800 text-neutral-100 py-0.5 rounded', pinned ? 'px-2' : 'px-1 text-xs')}>
            {name}
          </div>
        </div>
      )}

      {/* Speaking indicator. */}
      <div className='z-10 absolute bottom-1 left-1 flex'>
        <IconButton
          classNames={mx(
            'p-1 min-bs-1 rounded transition-opacity duration-300 opacity-0',
            (mute || speaking) && 'opacity-100',
            mute && 'bg-orange-500',
          )}
          icon={mute ? 'ph--microphone-slash--regular' : 'ph--waveform--regular'}
          size={pinned ? 5 : 3}
          label={mute ? 'Mute' : ''}
          iconOnly
        />
      </div>
    </div>
  );
};
