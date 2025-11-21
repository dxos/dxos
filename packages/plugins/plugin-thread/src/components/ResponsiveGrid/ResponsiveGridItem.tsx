//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, type PropsWithChildren, useEffect, useState } from 'react';

import { Icon, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Waveform } from '@dxos/react-ui-sfx';
import { groupHoverControlItemWithTransition, mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';

export type ResponsiveGridItemProps<T extends object = any> = PropsWithChildren<
  ThemedClassName<{
    item: T;
    style?: CSSProperties;
    pinned?: boolean;
    name?: string;
    self?: boolean;
    screenshare?: boolean;
    video?: boolean;
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
  video,
  mute,
  wave,
  speaking,
  onClick,
}: ResponsiveGridItemProps<T>) => {
  const { t } = useTranslation(meta.id);
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

  // Debounce speaking indicator.
  const [speakingIndicator, setSpeakingIndicator] = useState(speaking);
  useEffect(() => {
    if (speaking) {
      setSpeakingIndicator(true);
    } else {
      const timeout = setTimeout(() => {
        setSpeakingIndicator(false);
      }, 1_000);
      return () => clearTimeout(timeout);
    }
  }, [speaking]);

  return (
    <div
      className={mx(
        'relative is-full bs-full group',
        'rounded-md outline outline-2 outline-neutral-900 transition-[outline-color] duration-500',
        speakingIndicator ? 'outline-green-500' : !video && 'outline-separator',
        classNames,
      )}
      style={style}
    >
      {children}

      {/* Action. */}
      {onClick && (
        <div className='z-10 absolute top-1 right-1 flex'>
          <IconButton
            classNames={mx('p-1 min-bs-1 rounded', groupHoverControlItemWithTransition)}
            iconOnly
            icon={pinned ? 'ph--x--regular' : 'ph--arrows-out--regular'}
            size={pinned ? 5 : 4}
            label={pinned ? t('icon unpin') : t('icon pin')}
            onClick={() => onClick?.(item)}
          />
        </div>
      )}

      {/* Name. */}
      {name && (
        <div className='z-10 absolute bottom-1 left-8 right-1 flex justify-end gap-1 items-center'>
          {/* TODO(burdon): Replace with avatar for everyone. */}
          {/* {self && <Icon icon='ph--asterisk--regular' size={pinned ? 5 : 4} />} */}
          {screenshare && <Icon icon='ph--broadcast--regular' size={pinned ? 5 : 4} />}
          <div
            className={mx(
              'bg-neutral-800 text-neutral-100 plb-0.5 truncate rounded',
              pinned ? 'pli-2' : 'pli-1 text-xs',
            )}
          >
            {name}
          </div>
        </div>
      )}

      {/* Activity. */}
      <div className='z-10 absolute bottom-1 left-1 flex'>
        {(speaking && <Waveform active size={pinned ? 5 : 4} />) ||
          (props && (
            <IconButton
              classNames={mx('p-1 min-bs-1 rounded', props?.classNames)}
              icon={props?.icon}
              label={props?.label}
              size={pinned ? 5 : 4}
              iconOnly
            />
          ))}
      </div>
    </div>
  );
};
