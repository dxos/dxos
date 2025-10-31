//
// Copyright 2025 DXOS.org
//

import React, { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from 'react';
import { QR } from 'react-qr-rounded';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { type Space, fullyQualifiedId, useSpaceInvitations } from '@dxos/react-client/echo';
import { type CancellableInvitationObservable, Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { Button, Clipboard, Icon, Input, useId, useTranslation } from '@dxos/react-ui';
import { ControlFrame, ControlFrameItem, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';
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

import { meta } from '../../meta';
import { SpaceAction } from '../../types';
import { COMPOSER_SPACE_LOCK } from '../../util';

// TODO(wittjosiah): Copied from Shell.
const activeActionKey = 'dxos:react-shell/space-manager/active-action';

const handleInvitationEvent = (invitation: Invitation, subscription: ZenObservable.Subscription) => {
  const invitationCode = InvitationEncoder.encode(invitation);
  if (invitation.state === Invitation.State.CONNECTING) {
    log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    subscription.unsubscribe();
  }
};

export type MembersContainerProps = {
  space: Space;
  createInvitationUrl: (invitationCode: string) => string;
};

export const MembersContainer = ({ space, createInvitationUrl }: MembersContainerProps) => {
  const { t } = useTranslation(meta.id);
  const config = useConfig();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const invitations = useSpaceInvitations(space.key);
  const visibleInvitations = invitations?.filter(
    (invitation) => ![Invitation.State.CANCELLED].includes(invitation.get().state),
  );

  const [activeAction, setInternalActiveAction] = useState(localStorage.getItem(activeActionKey) ?? 'inviteMany');

  const setActiveAction = (nextAction: string) => {
    setInternalActiveAction(nextAction);
    localStorage.setItem(activeActionKey, nextAction);
  };

  // TODO(wittjosiah): Track which was the most recently viewed object.
  const target = space.properties[DataType.Collection.typename]?.target?.objects[0]?.target;

  const locked = space.properties[COMPOSER_SPACE_LOCK];
  const handleChangeLocked = useCallback(() => {
    space.properties[COMPOSER_SPACE_LOCK] = !locked;
  }, [locked, space]);

  const inviteActions = useMemo(
    (): Record<string, ActionMenuItem> => ({
      inviteOne: {
        label: t('invite one label', { ns: 'os' }),
        description: t('invite one description', { ns: 'os' }),
        icon: 'ph--user-plus--regular',
        testId: 'membersContainer.inviteOne',
        onClick: async () => {
          const { data: invitation } = await dispatch(
            createIntent(SpaceAction.Share, {
              space,
              type: Invitation.Type.INTERACTIVE,
              authMethod: Invitation.AuthMethod.SHARED_SECRET,
              multiUse: false,
              target: target && fullyQualifiedId(target),
            }),
          );
          if (invitation && config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
            const subscription: ZenObservable.Subscription = invitation.subscribe((invitation) =>
              handleInvitationEvent(invitation, subscription),
            );
          }
        },
      },
      inviteMany: {
        label: t('invite many label', { ns: 'os' }),
        description: t('invite many description', { ns: 'os' }),
        icon: 'ph--users-three--regular',
        testId: 'membersContainer.inviteMany',
        onClick: async () => {
          const { data: invitation } = await dispatch(
            createIntent(SpaceAction.Share, {
              space,
              type: Invitation.Type.DELEGATED,
              authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
              multiUse: true,
              target: target && fullyQualifiedId(target),
            }),
          );
          if (invitation && config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
            const subscription: ZenObservable.Subscription = invitation.subscribe((invitation) =>
              handleInvitationEvent(invitation, subscription),
            );
          }
        },
      },
    }),
    [t, space, target],
  );

  const [selectedInvitation, setSelectedInvitation] = useState<CancellableInvitationObservable | null>(null);
  const handleSend = (event: { type: 'selectInvitation'; invitation: CancellableInvitationObservable }) => {
    setSelectedInvitation(event.invitation);
  };
  const handleBack = () => {
    setSelectedInvitation(null);
  };

  return (
    <Clipboard.Provider>
      <StackItem.Content scrollable>
        <ControlPage>
          <ControlSection title={t('members verbose label')} description={t('members description')}>
            <ControlFrame>
              <ControlFrameItem title={t('members label')}>
                <SpaceMemberList spaceKey={space.key} includeSelf />
              </ControlFrameItem>
              {locked && (
                <ControlFrameItem title={t('invitations label')}>
                  <p className='text-description mbe-2'>{t('locked space description')}</p>
                </ControlFrameItem>
              )}
              {!locked && (
                <ControlFrameItem title={t('invitations label')}>
                  {selectedInvitation && <InvitationSection {...selectedInvitation} onBack={handleBack} />}
                  {!selectedInvitation && (
                    <>
                      <p className='text-description mbe-2'>{t('space invitation description')}</p>
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
                        data-testid='membersContainer.createInvitation'
                      />
                    </>
                  )}
                </ControlFrameItem>
              )}
            </ControlFrame>
            {/* TODO(wittjosiah): Make ControlItemInput & ControlFrame compatible. */}
            <div className='justify-center p-0 mbs-4 container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content]'>
              <ControlItemInput title={t('space locked label')} description={t('space locked description')}>
                <Input.Switch checked={locked} onCheckedChange={handleChangeLocked} classNames='justify-self-end' />
              </ControlItemInput>
            </div>
          </ControlSection>
        </ControlPage>
      </StackItem.Content>
    </Clipboard.Provider>
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
    <>
      <p className='text-description'>{t('qr code description', { ns: meta.id })}</p>
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
    </>
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
  return statusValue > 0 ? (
    <Icon icon='ph--check--regular' size={6} classNames='m-1.5' />
  ) : (
    <Icon icon='ph--x--regular' size={6} classNames='m-1.5' />
  );
};
