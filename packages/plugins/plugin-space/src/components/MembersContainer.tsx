//
// Copyright 2025 DXOS.org
//

import { Check, X } from '@phosphor-icons/react';
import React, { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { QR } from 'react-qr-rounded';

import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { useSpaceInvitations, type Space } from '@dxos/react-client/echo';
import { type CancellableInvitationObservable, Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { Button, Clipboard, Icon, useId, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { getSize, mx } from '@dxos/react-ui-theme';
import {
  type ActionMenuItem,
  AuthCode,
  BifurcatedAction,
  Centered,
  Emoji,
  InvitationList,
  SpaceMemberList,
  Viewport,
} from '@dxos/shell/react';
import { hexToEmoji } from '@dxos/util';

import { ControlFrame, ControlFrameItem, ControlSection } from './ControlSection';
import { SPACE_PLUGIN } from '../meta';

// TODO(wittjosiah): Copied from Shell.
const activeActionKey = 'dxos:react-shell/space-manager/active-action';

const handleInvitationEvent = (invitation: Invitation, subscription: ZenObservable.Subscription) => {
  const invitationCode = InvitationEncoder.encode(invitation);
  if (invitation.state === Invitation.State.CONNECTING) {
    log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    subscription.unsubscribe();
  }
};

export const MembersContainer = ({
  space,
  createInvitationUrl,
}: {
  space: Space;
  createInvitationUrl: (invitationCode: string) => string;
}) => {
  const { t } = useTranslation('os');
  const config = useConfig();
  const invitations = useSpaceInvitations(space.key);
  const visibleInvitations = invitations?.filter(
    (invitation) => ![Invitation.State.CANCELLED].includes(invitation.get().state),
  );

  const [activeAction, setInternalActiveAction] = useState(localStorage.getItem(activeActionKey) ?? 'inviteMany');

  const setActiveAction = (nextAction: string) => {
    setInternalActiveAction(nextAction);
    localStorage.setItem(activeActionKey, nextAction);
  };

  const inviteActions = useMemo(
    (): Record<string, ActionMenuItem> => ({
      inviteOne: {
        label: t('invite one label'),
        description: t('invite one description'),
        icon: () => <Icon icon='ph--user-plus--regular' size={5} />,
        testId: 'spaces-panel.invite-one',
        onClick: () => {
          const invitation = space.share?.({
            type: Invitation.Type.INTERACTIVE,
            authMethod: Invitation.AuthMethod.SHARED_SECRET,
            multiUse: false,
          });
          if (invitation && config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
            const subscription: ZenObservable.Subscription = invitation.subscribe((invitation) =>
              handleInvitationEvent(invitation, subscription),
            );
          }
        },
      },
      inviteMany: {
        label: t('invite many label'),
        description: t('invite many description'),
        icon: () => <Icon icon='ph--users-three--regular' size={5} />,
        testId: 'spaces-panel.invite-many',
        onClick: () => {
          const invitation = space.share?.({
            type: Invitation.Type.DELEGATED,
            authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
            multiUse: true,
          });
          if (invitation && config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
            const subscription: ZenObservable.Subscription = invitation.subscribe((invitation) =>
              handleInvitationEvent(invitation, subscription),
            );
          }
        },
      },
    }),
    [t, space],
  );

  const [selectedInvitation, setSelectedInvitation] = useState<CancellableInvitationObservable | null>(null);
  const handleSend = (event: { type: 'selectInvitation'; invitation: CancellableInvitationObservable }) => {
    setSelectedInvitation(event.invitation);
  };
  const handleBack = () => {
    setSelectedInvitation(null);
  };

  return (
    <StackItem.Content classNames='p-2 block overflow-y-auto'>
      <ControlSection
        title={t('members verbose label', { ns: SPACE_PLUGIN })}
        description={t('members description', { ns: SPACE_PLUGIN })}
      >
        <ControlFrame>
          <ControlFrameItem title={t('members label', { ns: SPACE_PLUGIN })}>
            <SpaceMemberList spaceKey={space.key} includeSelf />
          </ControlFrameItem>
          <ControlFrameItem title={t('invitations label', { ns: SPACE_PLUGIN })}>
            {selectedInvitation && <InvitationSection {...selectedInvitation} onBack={handleBack} />}
            {!selectedInvitation && (
              <>
                <p className='text-description mbe-2'>{t('space invitation description', { ns: SPACE_PLUGIN })}</p>
                <InvitationList
                  className='mb-2'
                  send={handleSend}
                  invitations={visibleInvitations ?? []}
                  onClickRemove={(invitation) => invitation.cancel()}
                  createInvitationUrl={createInvitationUrl}
                />
                <BifurcatedAction
                  actions={inviteActions}
                  activeAction={activeAction}
                  onChangeActiveAction={setActiveAction as Dispatch<SetStateAction<string>>}
                  data-testid='spaces-panel.create-invitation'
                />
              </>
            )}
          </ControlFrameItem>
        </ControlFrame>
      </ControlSection>
    </StackItem.Content>
  );
};

// TODO(wittjosiah): Reconcile the below components with DevicesContainer in @dxos/plugin-client.

type InvitationComponentProps = Partial<
  Pick<Invitation, 'authCode' | 'invitationId'> & {
    state: Invitation.State;
    url: string;
    onBack: () => void;
  }
>;

const InvitationSection = ({
  state = Invitation.State.INIT,
  authCode,
  invitationId = 'never',
  url = 'never',
  onBack,
}: InvitationComponentProps) => {
  const activeView =
    state < 0
      ? 'init'
      : state >= Invitation.State.CANCELLED
        ? 'complete'
        : state >= Invitation.State.READY_FOR_AUTHENTICATION && authCode
          ? 'auth-code'
          : 'qr-code';
  return (
    <Viewport.Root activeView={activeView}>
      <Viewport.Views>
        <Viewport.View id='init'>
          {/* This view intentionally left blank while conditionally rendering the viewport. */}
        </Viewport.View>
        <Viewport.View id='complete'>
          <InvitationComplete statusValue={state} />
        </Viewport.View>
        <Viewport.View id='auth-code'>
          <InvitationAuthCode id={invitationId} code={authCode ?? 'never'} onCancel={onBack} />
        </Viewport.View>
        <Viewport.View id='qr-code'>
          <InvitationQR id={invitationId} url={url} onCancel={onBack} />
        </Viewport.View>
      </Viewport.Views>
    </Viewport.Root>
  );
};

const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCancel?: () => void }) => {
  const { t } = useTranslation('os');
  const qrLabel = useId('members-container__qr-code');
  const emoji = hexToEmoji(id);
  return (
    <Clipboard.Provider>
      <p className='text-description'>{t('qr code description', { ns: SPACE_PLUGIN })}</p>
      <div role='group' className='grid grid-cols-[1fr_min-content] mlb-2 gap-2'>
        <div role='none' className='is-full aspect-square relative text-description'>
          <QR
            rounding={100}
            backgroundColor='transparent'
            color='currentColor'
            aria-labelledby={qrLabel}
            errorCorrectionLevel='Q'
            cutout={true}
          >
            {url ?? 'never'}
          </QR>
          <Centered>
            <Emoji text={emoji} />
          </Centered>
        </div>
        <span id={qrLabel} className='sr-only'>
          {t('qr label')}
        </span>
        <Clipboard.Button value={url ?? 'never'} />
      </div>
      <Button variant='ghost' onClick={onCancel}>
        {t('cancel label')}
      </Button>
    </Clipboard.Provider>
  );
};

const InvitationAuthCode = ({ id, code, onCancel }: { id: string; code: string; onCancel?: () => void }) => {
  const { t } = useTranslation('os');
  const emoji = hexToEmoji(id);

  return (
    <>
      <p className='text-description'>{t('auth other device emoji message')}</p>
      {emoji && <Emoji text={emoji} className='mli-auto mlb-2 text-center' />}
      <p className='text-description'>{t('auth code message')}</p>
      <AuthCode code={code} large classNames='mli-auto mlb-2 text-center grow' />
      <Button variant='ghost' onClick={onCancel}>
        {t('cancel label')}
      </Button>
    </>
  );
};

const InvitationComplete = ({ statusValue }: { statusValue: number }) => {
  return statusValue > 0 ? <Check className={mx('m-1.5', getSize(6))} /> : <X className={mx('m-1.5', getSize(6))} />;
};
