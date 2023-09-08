//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Avatar, useJdenticonHref } from '@dxos/aurora';

export type HaloButtonProps = {
  identityKey?: string;
  onClick?: () => void;
};

export const HaloButton = (props: HaloButtonProps) => {
  const { onClick, identityKey } = props;
  const jdenticon = useJdenticonHref(identityKey ?? '', 24);
  return (
    <Avatar.Root size={8} variant='circle' status='active'>
      <Avatar.Frame data-testid='treeView.haloButton' classNames='cursor-pointer' onClick={onClick}>
        <Avatar.Fallback href={jdenticon} />
      </Avatar.Frame>
    </Avatar.Root>
  );
};
