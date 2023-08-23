//
// Copyright 2023 DXOS.org
//

import { Check, X } from '@phosphor-icons/react';
import React, { useMemo } from 'react';
import { QR } from 'react-qr-rounded';

import { useId, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import type { InvitationStatus } from '@dxos/react-client/invitations';

import { Actions, Viewport, ViewportViewProps } from '../components';
import { AuthCode } from '../components/AuthCode';
import { Action } from '../components/Panel/Action';
import { Emoji, Centered } from '../components/Panel/Emoji';
import { Label } from '../components/Panel/Label';
import { invitationStatusValue, toEmoji } from '../util';
import { StepProps } from './StepProps';

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
        <div role='none' className='aspect-square is-full bs-auto relative text-neutral-600 dark:text-neutral-500'>
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

export const InvitationManager = ({
  invitationUrl,
  active,
  send,
  doneActionParent,
  onDone,
  status,
  authCode,
  id,
}: InvitationManagerProps) => {
  const { t } = useTranslation('os');
  const qrLabel = useId('invitation-manager__qr-code');
  const statusValue = invitationStatusValue.get(status!) ?? 0;
  const showAuthCode = statusValue === 3;
  const emoji = toEmoji(id ?? '');
  // const doneAction = (
  //   <PanelAction
  //     aria-label={t('done label')}
  //     onClick={onDone}
  //     disabled={!active}
  //     classNames='order-2'
  //     data-testid='identity-panel-done'
  //   >
  //     <Check weight='light' className={getSize(6)} />
  //   </PanelAction>
  // );
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
            >
              {invitationUrl ?? 'never'}
            </QR>
            <span id={qrLabel} className='sr-only'>
              {t('qr label')}
            </span>
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
      {/* <CopyButton classNames='flex' disabled={!active} value={invitationUrl ?? 'never'} /> */}
      <Actions classNames='mbs-4'>
        <Action aria-label={t('back label')} disabled={!active} onClick={() => send?.({ type: 'deselectInvitation' })}>
          <span>Back</span>
        </Action>
        {/* <CopyButtonIconOnly
          variant='ghost'
          classNames='order-1 p-4'
          disabled={!active || activeView === 'showing final'}
          value={activeView === 'showing auth code' ? authCode! : invitationUrl ?? 'never'}
          iconProps={{
            weight: 'light',
            className: getSize(6),
          }}
        /> */}
        {/* {doneActionParent ? cloneElement(doneActionParent, {}, doneAction) : doneAction} */}
        {/* <PanelAction
          aria-label={t('back label')}
          disabled={!active}
          onClick={() => send?.({ type: 'deselectInvitation' })}
        >
          <CaretLeft weight='light' className={getSize(6)} />
        </PanelAction> */}
      </Actions>
    </>
  );
};
