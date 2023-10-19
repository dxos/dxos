//
// Copyright 2023 DXOS.org
//

import { Check, X } from '@phosphor-icons/react';
import React, { useMemo } from 'react';
import { QR } from 'react-qr-rounded';

import type { InvitationStatus } from '@dxos/react-client/invitations';
import { useId, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { type StepProps } from './StepProps';
import {
  Actions,
  Action,
  AuthCode,
  Emoji,
  Centered,
  Label,
  Viewport,
  type ViewportViewProps,
  CopyButton,
} from '../components';
import { invitationStatusValue, toEmoji } from '../util';

export type InvitationManagerProps = StepProps &
  Partial<InvitationStatus> & {
    invitationUrl?: string;
  };

const InvitationManagerView = ({
  children,
  classNames: _classNames,
  emoji,
  ...props
}: ViewportViewProps & { emoji?: string }) => {
  return (
    <Viewport.View {...props} classNames='grow'>
      <div role='none' className='is-full max-is-[14rem] mli-auto'>
        <div
          role='none'
          className='flex flex-col items-center aspect-square is-full bs-auto relative text-neutral-600 dark:text-neutral-500'
        >
          {children}
          {emoji && (
            <Centered>
              <Emoji text={emoji} />
            </Centered>
          )}
        </div>
      </div>
    </Viewport.View>
  );
};

export const InvitationManager = ({ invitationUrl, active, send, status, authCode, id }: InvitationManagerProps) => {
  const { t } = useTranslation('os');
  const qrLabel = useId('invitation-manager__qr-code');
  const statusValue = invitationStatusValue.get(status!) ?? 0;
  const showAuthCode = statusValue === 3;
  const emoji = toEmoji(id ?? '');
  const activeView = useMemo(() => {
    switch (true) {
      case statusValue === 5:
      case statusValue < 0:
        return 'showing final';
      case statusValue === 3:
        return 'showing auth code';
      default:
        return 'showing qr';
    }
  }, [statusValue]);
  return (
    <>
      <Viewport.Root activeView={activeView} classNames='grow'>
        <Viewport.Views>
          <InvitationManagerView id='showing qr' emoji={emoji}>
            <QR
              rounding={100}
              backgroundColor='transparent'
              color='currentColor'
              className={mx('is-full bs-full p-2', showAuthCode && 'invisible')}
              aria-labelledby={qrLabel}
              errorCorrectionLevel='Q'
              cutout={true}
            >
              {invitationUrl ?? 'never'}
            </QR>
            <span id={qrLabel} className='sr-only'>
              {t('qr label')}
            </span>
            <CopyButton variant='ghost' value={invitationUrl ?? 'never'} />
          </InvitationManagerView>
          <InvitationManagerView id='showing auth code'>
            <div role='none' className='absolute inset-0 flex flex-col justify-between items-center'>
              <Label>{t('auth code message')}</Label>
              <AuthCode code={authCode} large className='text-black dark:text-white' />
              <Label>Be sure the other device is showing this symbol:</Label>
              {emoji && <Emoji text={emoji} />}
            </div>
          </InvitationManagerView>
          <InvitationManagerView id='showing final'>
            <div role='none' className='absolute inset-0 flex flex-col justify-around items-center'>
              {statusValue > 0 ? (
                <Check className={mx('m-1.5', getSize(6))} />
              ) : (
                <X className={mx('m-1.5', getSize(6))} />
              )}
            </div>
          </InvitationManagerView>
        </Viewport.Views>
      </Viewport.Root>
      <Actions classNames='mbs-4'>
        <Action disabled={!active} onClick={() => send?.({ type: 'deselectInvitation' })}>
          {t('back label')}
        </Action>
      </Actions>
    </>
  );
};
