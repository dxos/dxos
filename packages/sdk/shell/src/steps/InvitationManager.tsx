//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type InvitationStatus } from '@dxos/react-client/invitations';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as QrCode from '@dxos/react-ui/QrCode';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Typography from '@dxos/react-ui/Typography';
import { mx } from '@dxos/ui-theme';
import { hexToEmoji } from '@dxos/util';

import { AuthCode, Centered, Emoji, Viewport, type ViewportViewProps } from '../components/index.ts';
import { translationKey } from '../translations.ts';
import { invitationStatusValue } from '../util/index.ts';
import { type StepProps } from './StepProps.ts';

export type InvitationManagerProps = StepProps &
  Partial<InvitationStatus> & {
    invitationUrl?: string;
  };

export const InvitationManager = ({
  invitationUrl,
  active,
  send,
  status,
  multiUse,
  authCode,
  id = '0',
}: InvitationManagerProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const qrLabel = Hooks.useId('invitation-manager__qr-code');
  const statusValue = multiUse ? 0 : (invitationStatusValue.get(status!) ?? 0);
  const showAuthCode = statusValue === 3;
  const emoji = hexToEmoji(id);
  const activeView = useMemo(() => {
    if (multiUse) {
      return 'showing-qr';
    }
    switch (true) {
      case statusValue === 5:
      case statusValue < 0:
        return 'showing-final';
      case statusValue === 3:
        return 'showing-auth-code';
      default:
        return 'showing-qr';
    }
  }, [statusValue]);

  return (
    <>
      <Dialog.Body>
        <Viewport.Root activeView={activeView}>
          <Viewport.Views>
            <InvitationManagerView id='showing-qr' emoji={emoji}>
              <Typography.Text tone='muted'>
                {t(multiUse ? 'invite-many-qr.label' : 'invite-one-qr.label')}
              </Typography.Text>
              <div className={mx('text-fg-muted', 'w-full max-w-[14rem] relative')}>
                <QrCode.QrCode
                  classNames={[showAuthCode && 'invisible']}
                  aria-labelledby={qrLabel}
                  errorCorrection='Q'
                  value={invitationUrl ?? 'never'}
                />
                <Centered>
                  <Emoji text={emoji} />
                </Centered>
              </div>
              <span id={qrLabel} className='sr-only'>
                {t('qr.label')}
              </span>
              <SystemButton.Clipboard variant='ghost' value={invitationUrl ?? 'never'} />
            </InvitationManagerView>
            <InvitationManagerView id='showing-auth-code'>
              <Typography.Text tone='muted'>{t('auth-code.message')}</Typography.Text>
              <AuthCode code={authCode} large classNames='text-black dark:text-white' />
              <Typography.Text tone='muted'>{t('auth-other-device-emoji.message')}</Typography.Text>
              {emoji && <Emoji text={emoji} />}
            </InvitationManagerView>
            <InvitationManagerView id='showing-final'>
              <Icon.Icon icon={statusValue > 0 ? 'ph--check--regular' : 'ph--x--regular'} size='xl' />
            </InvitationManagerView>
          </Viewport.Views>
        </Viewport.Root>
      </Dialog.Body>
      <Dialog.Footer>
        <Button.Root disabled={!active} onClick={() => send?.({ type: 'deselectInvitation' })}>
          {t('back.label')}
        </Button.Root>
      </Dialog.Footer>
    </>
  );
};

/** One state of the invitation; its rows stack a gap apart, as the Dialog.Body's own rows do. */
const InvitationManagerView = ({ children, ...props }: ViewportViewProps & { emoji?: string }) => {
  return (
    <Viewport.View {...props} classNames='gap-2'>
      {children}
    </Viewport.View>
  );
};
