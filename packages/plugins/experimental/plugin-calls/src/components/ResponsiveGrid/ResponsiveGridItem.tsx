//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, type PropsWithChildren } from 'react';

import { IconButton, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { Waveform } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { CALLS_PLUGIN } from '../../meta';

const hover = mx('transition-opacity duration-300 opacity-0 group-hover:opacity-100');

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
    speaking: {
      icon: 'ph--waveform--regular',
      label: t('icon speaking'),
    },
  };

  const props = wave && !pinned ? iconProps.wave : mute ? iconProps.mute : speaking ? iconProps.speaking : undefined;

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
            label={pinned ? t('icon unpin') : t('icon pin')}
            onClick={onClick}
          />
        </div>
      )}

      {/* Name. */}
      {name && (
        <div className='z-10 absolute bottom-1 right-1 flex gap-1 items-center'>
          <div className={mx('bg-neutral-800 text-neutral-100 py-0.5 rounded', pinned ? 'px-2' : 'px-1 text-xs')}>
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
