//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check, X } from '@phosphor-icons/react';
import React, { cloneElement, PropsWithChildren, ReactNode, useMemo } from 'react';
import { QR } from 'react-qr-rounded';

import { useId, useTranslation } from '@dxos/aurora';
import { chromeSurface, getSize, mx } from '@dxos/aurora-theme';
import type { InvitationStatus } from '@dxos/react-client/invitations';

import { CopyButtonIconOnly, PanelAction, PanelActions, Viewport, ViewportViewProps } from '../components';
import { invitationStatusValue, toEmoji } from '../util';
import { StepProps } from './StepProps';

type InvitationManagerProps = StepProps &
  Partial<InvitationStatus> & {
    invitationUrl?: string;
  };

const Emoji = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div role='none' className='absolute inset-0 flex items-center justify-center pointer-events-none'>
      <div role='none' className={mx(getSize(10), 'rounded border-2 border-current rotate-45 relative', chromeSurface)}>
        <p className='text-2xl !leading-[2.2rem] absolute inset-0 -rotate-45 text-center'>{children}</p>
      </div>
    </div>
  );
};

const InvitationManagerView = ({
  children,
  classNames: _classNames,
  emoji,
  ...props
}: ViewportViewProps & { emoji: ReactNode }) => {
  return (
    <Viewport.View {...props} classNames='grow'>
      <div role='none' className='is-full max-is-[12rem] mli-auto'>
        <div role='none' className='aspect-square is-full bs-auto relative'>
          {children}
          <Emoji>{emoji}</Emoji>
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
  const doneAction = (
    <PanelAction
      aria-label={t('done label')}
      onClick={onDone}
      disabled={!active}
      classNames='order-1'
      data-testid='identity-panel-done'
    >
      <Check weight='light' className={getSize(6)} />
    </PanelAction>
  );
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
              className={mx('is-full bs-full', showAuthCode && 'invisible')}
              aria-labelledby={qrLabel}
              errorCorrectionLevel='M'
            >
              {invitationUrl ?? 'never'}
            </QR>
            <span id={qrLabel} className='sr-only'>
              {t('qr label')}
            </span>
          </InvitationManagerView>
          <InvitationManagerView id='showing auth code' emoji={emoji}>
            <p className='text-[6rem] leading-[6rem] break-all text-center text-success-500 dark:text-success-300 font-mono'>
              {authCode}
            </p>
          </InvitationManagerView>
          <InvitationManagerView
            id='showing final'
            emoji={
              statusValue > 0 ? (
                <Check className={mx('m-1.5', getSize(6))} />
              ) : (
                <X className={mx('m-1.5', getSize(6))} />
              )
            }
          />
        </Viewport.Views>
      </Viewport.Root>
      {/* <CopyButton classNames='flex' disabled={!active} value={invitationUrl ?? 'never'} /> */}
      <PanelActions classNames='mbs-4'>
        {doneActionParent ? cloneElement(doneActionParent, {}, doneAction) : doneAction}
        <PanelAction
          aria-label={t('back label')}
          disabled={!active}
          onClick={() => send({ type: 'deselectInvitation' })}
        >
          <CaretLeft weight='light' className={getSize(6)} />
        </PanelAction>
        <CopyButtonIconOnly
          variant='ghost'
          disabled={!active || activeView === 'showing final'}
          value={activeView === 'showing auth code' ? authCode! : invitationUrl ?? 'never'}
          iconProps={{
            weight: 'light',
            className: getSize(6),
          }}
        />
      </PanelActions>
    </>
  );
};
