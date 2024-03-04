//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Identity } from '@dxos/react-client/halo';
import { Avatar, type Size } from '@dxos/react-ui';
import { focusRing, mx } from '@dxos/react-ui-theme';
import { hexToFallback } from '@dxos/util';

const INTERNAL = 'https://avatars.githubusercontent.com/u/57182821';

export type HaloButtonProps = {
  size?: Size;
  identityKey?: string;
  internal?: boolean;
  onClick?: () => void;
} & Pick<Exclude<Identity['profile'], undefined>, 'hue' | 'emoji'>;

export const HaloButton = (props: HaloButtonProps) => {
  const { onClick, identityKey, internal, size = 8 } = props;
  const fallbackValue = hexToFallback(identityKey ?? '0');
  return (
    <button className={mx(focusRing, 'rounded grid place-items-center')} onClick={onClick}>
      <Avatar.Root
        size={size}
        variant='circle'
        status={internal ? 'internal' : 'active'}
        hue={props.hue || fallbackValue.hue}
      >
        <Avatar.Frame data-testid='treeView.haloButton' data-joyride='welcome/halo'>
          {internal ? <Avatar.Image href={INTERNAL} /> : <Avatar.Fallback text={props.emoji || fallbackValue.emoji} />}
        </Avatar.Frame>
      </Avatar.Root>
    </button>
  );
};
