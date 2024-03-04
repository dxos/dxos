//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type Identity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';

import { EmojiPicker } from './EmojiPicker';
import { HuePicker } from './HuePicker';
import { StepHeading } from '../Panel';

export const AvatarPicker = ({ identity, disabled }: { identity?: Identity; disabled?: boolean }) => {
  const { t } = useTranslation('os');
  return (
    <>
      <StepHeading className='mbe-2'>{t('emoji and color label')}</StepHeading>
      <div role='none' className='grid grid-cols-[1fr_min-content] gap-y-2'>
        <EmojiPicker identity={identity} disabled={disabled} />
        <HuePicker identity={identity} disabled={disabled} />
      </div>
    </>
  );
};
