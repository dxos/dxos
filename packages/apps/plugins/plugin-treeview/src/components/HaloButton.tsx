//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Avatar, Size, useJdenticonHref } from '@dxos/aurora';

export type HaloButtonProps = {
  size?: Size;
  identityKey?: string;
  onClick?: () => void;
};

export const HaloButton = (props: HaloButtonProps) => {
  const { onClick, identityKey, size = 8 } = props;
  const jdenticon = useJdenticonHref(identityKey ?? '', 24);
  return (
    <Avatar.Root size={size} variant='circle' status='active'>
      <Avatar.Frame data-testid='treeView.haloButton' classNames='cursor-pointer' onClick={onClick}>
        <Avatar.Fallback href={jdenticon} />
      </Avatar.Frame>
    </Avatar.Root>
  );
};
