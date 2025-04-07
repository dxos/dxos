//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ConnectionState, useNetworkStatus } from '@dxos/react-client/mesh';
import { Avatar, type Size } from '@dxos/react-ui';
import { focusRing, mx } from '@dxos/react-ui-theme';
import { hexToFallback } from '@dxos/util';

const INTERNAL = 'https://avatars.githubusercontent.com/u/57182821';

export type HaloButtonProps = {
  size?: Size;
  identityKey?: string;
  hue?: string;
  emoji?: string;
  internal?: boolean;
  onClick?: () => void;
};

export const HaloButton = (props: HaloButtonProps) => {
  const { onClick, identityKey, internal, size = 8 } = props;
  const fallbackValue = hexToFallback(identityKey ?? '0');
  const { swarm: connectionState } = useNetworkStatus();
  return (
    <button className={mx(focusRing, 'rounded grid place-items-center')} onClick={onClick}>
      <Avatar.Root>
        <Avatar.Content
          size={size}
          variant='circle'
          status={connectionState === ConnectionState.OFFLINE ? 'error' : internal ? 'internal' : 'active'}
          hue={props.hue || fallbackValue.hue}
          data-testid='treeView.haloButton'
          data-joyride='welcome/halo'
          {...(internal ? { imgSrc: INTERNAL } : { fallback: props.emoji || fallbackValue.emoji })}
        />
      </Avatar.Root>
    </button>
  );
};
