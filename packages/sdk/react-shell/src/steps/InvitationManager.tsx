//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check } from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
import React, { cloneElement } from 'react';

import { Button, useId, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { CopyButton } from '../components';
import { StepProps } from './StepProps';

type InvitationManagerProps = StepProps & {
  invitationUrl?: string;
  authCode?: string;
};

export const InvitationManager = ({
  invitationUrl,
  authCode,
  active,
  send,
  doneActionParent,
  onDone,
}: InvitationManagerProps) => {
  const { t } = useTranslation('os');
  const qrLabel = useId('invitation-manager__qr-code');
  const doneButton = (
    <Button
      onClick={onDone}
      disabled={!active}
      classNames='order-1 gap-2 pis-2 pie-4'
      data-testid='identity-panel-done'
    >
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );
  return (
    <>
      <div role='none' className='grow flex items-center justify-center'>
        <div role='none' className='grow max-is-[12.5rem] mli-auto flex flex-col gap-2'>
          <div role='none' className='aspect-square is-full bs-auto relative'>
            <QRCodeSVG
              bgColor='transparent'
              fgColor='currentColor'
              value={invitationUrl ?? 'never'}
              className='is-full bs-full'
              aria-labelledby={qrLabel}
            />
            <p className='absolute text-xl text-center text-success-500 dark:text-success-300 font-mono'>{authCode}</p>
          </div>
          <span id={qrLabel} className='sr-only'>
            {t('qr label')}
          </span>
          <CopyButton classNames='flex is-full' disabled={!active} value={invitationUrl ?? 'never'} />
        </div>
      </div>
      <div className='flex gap-2 mbs-2'>
        {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
        <Button
          disabled={!active}
          onClick={() => send({ type: 'deselectInvitation' })}
          classNames='grow gap-2 pis-2 pie-4'
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('back label')}</span>
        </Button>
      </div>
    </>
  );
};
