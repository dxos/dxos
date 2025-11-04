//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';
import { QR } from 'react-qr-rounded';

import { type InvitationStatus } from '@dxos/react-client/invitations';
import { Clipboard, Icon, useId, useTranslation } from '@dxos/react-ui';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { hexToEmoji } from '@dxos/util';

import { Action, Actions, AuthCode, Centered, Emoji, Label, Viewport, type ViewportViewProps } from '../components';
import { invitationStatusValue } from '../util';

import { type StepProps } from './StepProps';

export type InvitationManagerProps = StepProps &
  Partial<InvitationStatus> & {
    invitationUrl?: string;
  };

const InvitationManagerView = ({ children, ...props }: ViewportViewProps & { emoji?: string }) => (
  <Viewport.View {...props} classNames='grow flex flex-col justify-around items-center'>
    {children}
  </Viewport.View>
);

export const InvitationManager = ({
  invitationUrl,
  active,
  send,
  status,
  multiUse,
  authCode,
  id = '0',
}: InvitationManagerProps) => {
  const { t } = useTranslation('os');
  const qrLabel = useId('invitation-manager__qr-code');
  const statusValue = multiUse ? 0 : (invitationStatusValue.get(status!) ?? 0);
  const showAuthCode = statusValue === 3;
  const emoji = hexToEmoji(id);
  const activeView = useMemo(() => {
    if (multiUse) {
      return 'showing qr';
    }
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
      <Viewport.Root activeView={activeView} classNames='grow plb-1'>
        <Viewport.Views>
          <InvitationManagerView id='showing qr' emoji={emoji}>
            <p className='text-sm mlb-1 font-normal text-center'>
              {t(multiUse ? 'invite many qr label' : 'invite one qr label')}
            </p>
            <div role='none' className={mx(descriptionText, 'is-full max-is-[14rem] relative')}>
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
              <Centered>
                <Emoji text={emoji} />
              </Centered>
            </div>
            <span id={qrLabel} className='sr-only'>
              {t('qr label')}
            </span>
            <Clipboard.Button variant='ghost' value={invitationUrl ?? 'never'} />
          </InvitationManagerView>
          <InvitationManagerView id='showing auth code'>
            <Label>{t('auth code message')}</Label>
            <AuthCode code={authCode} large classNames='text-black dark:text-white' />
            <Label>{t('auth other device emoji message')}</Label>
            {emoji && <Emoji text={emoji} />}
          </InvitationManagerView>
          <InvitationManagerView id='showing final'>
            {statusValue > 0 ? (
              <Icon icon='ph--check--regular' classNames={['m-1.5', getSize(6)]} />
            ) : (
              <Icon icon='ph--x--regular' classNames={['m-1.5', getSize(6)]} />
            )}
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
