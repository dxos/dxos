//
// Copyright 2023 DXOS.org
//

import { ArrowLeft } from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
import React from 'react';

import { Button, useId, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { StepProps } from './StepProps';

type InvitationManagerProps = StepProps & {
  invitationUrl: string;
  authCode?: string;
};

export const InvitationManager = ({ invitationUrl, authCode, active }: InvitationManagerProps) => {
  const { t } = useTranslation('os');
  const qrLabel = useId('invitation-manager__qr-code');
  return (
    <div role='none' className='flex items-center justify-between'>
      <Button variant='ghost' disabled={!active}>
        <ArrowLeft className={getSize(6)} />
        <span className='sr-only'>{t('back to all invitations label')}</span>
      </Button>
      {authCode ? (
        <p className='text-xl text-center text-success-500 dark:text-success-300 font-mono'>{authCode}</p>
      ) : (
        <>
          <QRCodeSVG
            bgColor='transparent'
            fgColor='currentColor'
            value={invitationUrl}
            className={mx('aspect-square is-24 bs-auto')}
            aria-labelledby={qrLabel}
          />
          <span id={qrLabel}>{t('qr label')}</span>
        </>
      )}
      <Button variant='ghost' classNames='invisible' disabled>
        <ArrowLeft className={getSize(6)} />
      </Button>
    </div>
  );
};
