//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, type PropsWithChildren, useEffect, useState } from 'react';

import { Waveform } from '@dxos/react-ui-components';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import type * as Util from '@dxos/react-ui/Util';
import { groupHoverControlItemWithTransition, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export type ResponsiveGridItemProps<T extends object = any> = PropsWithChildren<
  Util.ThemedClassName<{
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const iconProps: Record<string, { icon: string; label: string; classNames?: string }> = {
    wave: {
      icon: 'ph--hand-waving--duotone',
      label: t('icon-wave.label'),
      classNames: 'animate-pulse bg-orange-bg',
    },
    mute: {
      icon: 'ph--microphone-slash--regular',
      label: t('icon-muted.label'),
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
        'dx-expand relative group',
        'rounded-md outline outline-2 outline-neutral-900 transition-[outline-color] duration-500',
        speakingIndicator ? 'outline-green-border' : !video && 'outline-separator',
        classNames,
      )}
      style={style}
    >
      {children}

      {/* Action. */}
      {onClick && (
        <Layout.Flex classNames='z-10 absolute top-1 right-1'>
          <Button.Root
            classNames={mx('p-1 min-h-1 rounded-sm', groupHoverControlItemWithTransition)}
            iconOnly
            icon={pinned ? 'ph--x--regular' : 'ph--arrows-out--regular'}
            iconSize={pinned ? 'lg' : 'md'}
            label={pinned ? t('icon-unpin.label') : t('icon-pin.label')}
            onClick={() => onClick?.(item)}
          />
        </Layout.Flex>
      )}

      {/* Name. */}
      {name && (
        <Layout.Flex justify='end' gap='xs' align='center' classNames='z-10 absolute bottom-1 left-8 right-1'>
          {/* TODO(burdon): Replace with avatar for everyone. */}
          {/* {self && <Icon icon='ph--asterisk--regular' size={pinned ? 5 : 4} />} */}
          {screenshare && <Icon.Icon icon='ph--broadcast--regular' size={pinned ? 'lg' : 'md'} />}
          <div
            className={mx(
              'bg-neutral-800 text-neutral-100 py-0.5 truncate rounded-sm',
              pinned ? 'px-2' : 'px-1 text-xs',
            )}
          >
            {name}
          </div>
        </Layout.Flex>
      )}

      {/* Activity. */}
      <Layout.Flex classNames='z-10 absolute bottom-1 left-1'>
        {(speaking && <Waveform active size={pinned ? 5 : 4} />) ||
          (props && (
            <Button.Root
              classNames={mx('p-1 min-h-1 rounded-sm', props?.classNames)}
              icon={props?.icon}
              label={props?.label}
              iconSize={pinned ? 'lg' : 'md'}
              iconOnly
            />
          ))}
      </Layout.Flex>
    </div>
  );
};
