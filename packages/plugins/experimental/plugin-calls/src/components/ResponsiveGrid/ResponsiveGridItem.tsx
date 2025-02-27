//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, type PropsWithChildren } from 'react';

import { Icon, IconButton, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { Waveform } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { CALLS_PLUGIN } from '../../meta';

const hover = mx('transition-opacity duration-300 opacity-0 group-hover:opacity-100');

export type ResponsiveGridItemProps<T extends object = any> = PropsWithChildren<
  ThemedClassName<{
    item: T;
    style?: CSSProperties;
    pinned?: boolean;
    name?: string;
    self?: boolean;
    screenshare?: boolean;
    mute?: boolean;
    wave?: boolean;
    speaking?: boolean;
    debug?: boolean;
    onClick?: (item: T) => void;
  }>
>;

/**
 * Cell container.
 */
export const ResponsiveGridItem = <T extends object = any>({
  children,
  classNames,
  item,
  style,
  name,
  self,
  pinned,
  screenshare,
  mute,
  wave,
  speaking,
  onClick,
}: ResponsiveGridItemProps<T>) => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const iconProps: Record<string, { icon: string; label: string; classNames?: string }> = {
    wave: {
      icon: 'ph--hand-waving--duotone',
      label: t('icon wave'),
      classNames: 'animate-pulse bg-orange-500',
    },
    mute: {
      icon: 'ph--microphone-slash--regular',
      label: t('icon muted'),
    },
  };

  const props = wave && !pinned ? iconProps.wave : mute ? iconProps.mute : speaking ? iconProps.speaking : undefined;

  return (
    <div className={mx('w-full h-full aspect-video group relative', classNames)} style={style}>
      {children}

      {/* Action. */}
      {onClick && (
        <div className='z-10 absolute top-1 right-1 flex'>
          <IconButton
            classNames={mx('p-1 min-bs-1 rounded', hover)}
            iconOnly
            icon={pinned ? 'ph--x--regular' : 'ph--arrows-out--regular'}
            size={pinned ? 5 : 3}
            label={pinned ? t('icon unpin') : t('icon pin')}
            onClick={() => onClick?.(item)}
          />
        </div>
      )}

      {/* Name. */}
      {name && (
        <div className='z-10 absolute bottom-1 left-8 right-1 flex justify-end gap-1 items-center'>
          {self && <Icon icon='ph--asterisk--regular' size={pinned ? 5 : 3} />}
          {screenshare && <Icon icon='ph--broadcast--regular' size={pinned ? 5 : 3} />}
          <div
            className={mx('bg-neutral-800 text-neutral-100 py-0.5 truncate rounded', pinned ? 'px-2' : 'px-1 text-xs')}
          >
            {name}
          </div>
        </div>
      )}

      {/* Activity. */}
      <div className='z-10 absolute bottom-1 left-1 flex'>
        {(speaking && <Waveform active size={pinned ? 5 : 3} />) ||
          (props && (
            <IconButton
              classNames={mx('p-1 min-bs-1 rounded', props?.classNames)}
              icon={props?.icon}
              label={props?.label}
              size={pinned ? 5 : 3}
              iconOnly
            />
          ))}
      </div>
    </div>
  );
};
