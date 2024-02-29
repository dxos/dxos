//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Avatar, type Size } from '@dxos/react-ui';
import { focusRing, mx } from '@dxos/react-ui-theme';
import { stringToEmoji } from '@dxos/util';

const INTERNAL = 'https://avatars.githubusercontent.com/u/57182821';

export type HaloButtonProps = {
  size?: Size;
  identityKey?: string;
  internal?: boolean;
  onClick?: () => void;
};

export const HaloButton = (props: HaloButtonProps) => {
  const { onClick, identityKey, internal, size = 8 } = props;
  const fallbackValue = stringToEmoji(identityKey ?? '');
  return (
    <button className={mx(focusRing, 'rounded grid place-items-center')} onClick={onClick}>
      <Avatar.Root size={size} variant='circle' status={internal ? 'internal' : 'active'}>
        <Avatar.Frame data-testid='treeView.haloButton' data-joyride='welcome/halo'>
          {internal ? <Avatar.Image href={INTERNAL} /> : <Avatar.Fallback text={fallbackValue} />}
        </Avatar.Frame>
      </Avatar.Root>
    </button>
  );
};
