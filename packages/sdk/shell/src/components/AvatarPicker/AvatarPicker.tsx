//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type Identity } from '@dxos/react-client/halo';

import { EmojiPicker } from './EmojiPicker';
import { HuePicker } from './HuePicker';

export const AvatarPicker = ({ identity }: { identity?: Identity }) => {
  return (
    <div role='none' className='grid grid-cols-[1fr_min-content] gap-y-2'>
      <EmojiPicker identity={identity} />
      <HuePicker identity={identity} />
    </div>
  );
};
