//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useJdenticonHref, Avatar } from '@dxos/aurora';
import { Identity } from '@dxos/client/halo';

export type HaloButtonProps = {
  identity?: Identity | null;
  onClick?: () => void;
};

export const HaloButton = (props: HaloButtonProps) => {
  const { identity, onClick } = props;
  const jdenticon = useJdenticonHref(identity?.identityKey.toHex() ?? '', 24);
  return (
    <Avatar.Root size={10} variant='circle' status='active'>
      <Avatar.Frame data-testid='treeView.haloButton' classNames='cursor-pointer' onClick={onClick}>
        <Avatar.Fallback href={jdenticon} />
      </Avatar.Frame>
    </Avatar.Root>
  );
};
