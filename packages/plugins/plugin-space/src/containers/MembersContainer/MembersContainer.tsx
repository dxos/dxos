//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type Dispatch, type SetStateAction, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Annotation, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { type SpaceMember_Role, useSpaceInvitations } from '@dxos/react-client/echo';
import { useContacts } from '@dxos/react-client/halo';
import {
  type CancellableInvitationObservable,
  type Invitation,
  Invitation_AuthMethod,
  Invitation_State,
  Invitation_Type,
  InvitationEncoder,
} from '@dxos/react-client/invitations';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as QrCode from '@dxos/react-ui/QrCode';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import {
  type ActionMenuItem,
  AuthCode,
  BifurcatedAction,
  Centered,
  Emoji,
  InvitationList,
  SpaceMemberList,
  Viewport,
  contactDisplayName,
  contactKeyHex,
  translationKey as shellTranslationKey,
} from '@dxos/shell/react';
import { hexToEmoji } from '@dxos/util';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

// TODO(wittjosiah): Copied from Shell.
const activeActionKey = 'dxos:react-shell/space-manager/active-action';

const handleInvitationEvent = (invitation: Invitation, subscription: ZenObservable.Subscription) => {
  const invitationCode = InvitationEncoder.encode(invitation);
  if (invitation.state === Invitation_State.CONNECTING) {
    log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    subscription.unsubscribe();
  }
};

export type MembersContainerProps = AppSurface.SpaceArticleProps<{
  createInvitationUrl: (invitationCode: string) => string;
}>;

export const MembersContainer = ({ space, createInvitationUrl }: MembersContainerProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const config = useConfig();
  const { invokePromise } = Hooks.useOperationInvoker();
  const invitations = useSpaceInvitations(space.key);
  const visibleInvitations = invitations?.filter(
    (invitation) => ![Invitation_State.CANCELLED].includes(invitation.get().state),
  );

  const [activeAction, setInternalActiveAction] = useState(localStorage.getItem(activeActionKey) ?? 'inviteMany');

  const setActiveAction = (nextAction: string) => {
    setInternalActiveAction(nextAction);
    localStorage.setItem(activeActionKey, nextAction);
  };

  // TODO(wittjosiah): Track which was the most recently viewed object.
  const target = Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)
    ?.target?.objects[0]?.target;

  const inviteActions = useMemo(
    (): Record<string, ActionMenuItem> => ({
      inviteOne: {
        label: t('invite-one.label', { ns: shellTranslationKey }),
        description: t('invite-one.description', { ns: shellTranslationKey }),
        icon: 'ph--user-plus--regular',
        testId: 'membersContainer.inviteOne',
        onClick: async () => {
          const { data: invitation } = await invokePromise(SpaceOperation.Share, {
            space,
            type: Invitation_Type.INTERACTIVE,
            authMethod: Invitation_AuthMethod.SHARED_SECRET,
            multiUse: false,
            target: target && Obj.getURI(target),
          });
          if (invitation && config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
            const subscription: ZenObservable.Subscription = (invitation as CancellableInvitationObservable).subscribe(
              (invitation: Invitation) => handleInvitationEvent(invitation, subscription),
            );
          }
        },
      },
      inviteMany: {
        label: t('invite-many.label', { ns: shellTranslationKey }),
        description: t('invite-many.description', { ns: shellTranslationKey }),
        icon: 'ph--users-three--regular',
        testId: 'membersContainer.inviteMany',
        onClick: async () => {
          const { data: invitation } = await invokePromise(SpaceOperation.Share, {
            space,
            type: Invitation_Type.DELEGATED,
            authMethod: Invitation_AuthMethod.KNOWN_PUBLIC_KEY,
            multiUse: true,
            target: target && Obj.getURI(target),
          });
          if (invitation && config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
            const subscription: ZenObservable.Subscription = (invitation as CancellableInvitationObservable).subscribe(
              (invitation: Invitation) => handleInvitationEvent(invitation, subscription),
            );
          }
        },
      },
    }),
    [t, space, target, invokePromise],
  );

  const contacts = useContacts();
  const isSurfaceAvailable = Surface.useIsAvailable();
  const contactPickerData = useMemo(
    (): AppSurface.ContactPickerData => ({
      space,
      onAdd: async (identityKeys: string[], role: SpaceMember_Role) => {
        const { data, error } = await invokePromise(SpaceOperation.AddMembers, { space, identityKeys, role });
        if (error) {
          log.catch(error);
        }
        const result = data ?? {
          joinUrl: '',
          failed: identityKeys.map((key) => ({ key, error: error?.message ?? 'Unknown error' })),
          notNotified: [],
        };
        const namesOf = (entries: readonly { key: string }[]) =>
          entries
            .map(({ key }) => {
              const contact = contacts.find((candidate) => contactKeyHex(candidate) === key);
              return contact ? contactDisplayName(contact) : key.slice(0, 8);
            })
            .join(', ');
        if (result.failed.length > 0) {
          const names = namesOf(result.failed);
          await invokePromise(LayoutOperation.AddToast, {
            id: `${meta.profile.key}/add-members-failed`,
            title: ['add-members-failed-toast.title', { ns: meta.profile.key }],
            // Label tuples carry no interpolation values, so the names are resolved here.
            description: t('add-members-failed-toast.description', { names }),
            icon: 'ph--warning--regular',
          });
        }
        if (result.notNotified.length > 0) {
          const names = namesOf(result.notNotified);
          const accountRequired = result.notNotified.some(({ reason }) => reason === 'account-required');
          const { joinUrl } = result;
          await invokePromise(LayoutOperation.AddToast, {
            id: `${meta.profile.key}/add-members-not-notified`,
            title: ['add-members-not-notified-toast.title', { ns: meta.profile.key }],
            // Label tuples carry no interpolation values, so the names are resolved here.
            description: t(
              accountRequired
                ? 'add-members-not-notified-account-toast.description'
                : 'add-members-not-notified-toast.description',
              { names },
            ),
            icon: 'ph--bell-slash--regular',
            ...(joinUrl
              ? {
                  actionLabel: ['copy-link.label', { ns: meta.profile.key }],
                  onAction: () =>
                    void navigator.clipboard
                      .writeText(joinUrl)
                      .catch((error) => log.warn('failed to copy join link', { error })),
                }
              : {}),
          });
        }

        return result;
      },
    }),
    [t, space, contacts, invokePromise],
  );
  const showContactPicker = isSurfaceAvailable({ type: AppSurface.ContactPicker, data: contactPickerData });

  const [selectedInvitation, setSelectedInvitation] = useState<CancellableInvitationObservable | null>(null);
  const handleSend = (event: { type: 'selectInvitation'; invitation: CancellableInvitationObservable }) => {
    setSelectedInvitation(event.invitation);
  };
  const handleBack = () => {
    setSelectedInvitation(null);
  };

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('members-verbose.label')} description={t('members.description')}>
            <Form.FieldSet label={t('members.label')}>
              <SpaceMemberList spaceKey={space.key} includeSelf />
            </Form.FieldSet>
            {showContactPicker && (
              <Form.FieldSet label={t('add-known-people.label')}>
                <Surface.Surface type={AppSurface.ContactPicker} data={contactPickerData} limit={1} />
              </Form.FieldSet>
            )}
            <Form.FieldSet
              label={t('invitations.label')}
              description={selectedInvitation ? undefined : t('space-invitation.description')}
            >
              {selectedInvitation && <InvitationSection {...selectedInvitation} onBack={handleBack} />}
              {!selectedInvitation && (
                <>
                  <InvitationList
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
            </Form.FieldSet>
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

// TODO(wittjosiah): Reconcile the below components with DevicesContainer in @dxos/plugin-client.

type InvitationComponentProps = Partial<
  Pick<Invitation, 'authCode' | 'invitationId'> & {
    state: Invitation_State;
    url: string;
    onBack: () => void;
  }
>;

const InvitationSection = ({
  state = Invitation_State.INIT,
  authCode,
  invitationId = 'never',
  url = 'never',
  onBack,
}: InvitationComponentProps) => {
  const activeView =
    state < 0
      ? 'init'
      : state >= Invitation_State.CANCELLED
        ? 'complete'
        : state >= Invitation_State.READY_FOR_AUTHENTICATION && authCode
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
  const { t } = UiHooks.useTranslation(shellTranslationKey);
  const qrLabel = UiHooks.useId('members-container__qr-code');
  const emoji = hexToEmoji(id);
  return (
    <>
      <p className='text-fg-muted'>{t('qr-code.description', { ns: meta.profile.key })}</p>
      <Layout.Grid role='group' cols={['fill', 'min']} gap='sm' classNames='my-2'>
        <div className='w-full aspect-square relative text-fg-muted'>
          <QrCode.QrCode aria-labelledby={qrLabel} errorCorrection='Q' value={url ?? 'never'} />
          <Centered>
            <Emoji text={emoji} />
          </Centered>
        </div>
        <span id={qrLabel} className='sr-only'>
          {t('qr.label')}
        </span>
        <SystemButton.Clipboard value={url ?? 'never'} />
      </Layout.Grid>
      <Button.Root variant='ghost' onClick={onCancel}>
        {t('cancel.label')}
      </Button.Root>
    </>
  );
};

const InvitationAuthCode = ({ id, code, onCancel }: { id: string; code: string; onCancel?: () => void }) => {
  const { t } = UiHooks.useTranslation(shellTranslationKey);
  const emoji = hexToEmoji(id);

  return (
    <>
      <p className='text-fg-muted'>{t('auth-other-device-emoji.message')}</p>
      {emoji && <Emoji text={emoji} className='mx-auto my-2 text-center' />}
      <p className='text-fg-muted'>{t('auth-code.message')}</p>
      <AuthCode code={code} large classNames='mx-auto my-2 text-center grow' />
      <Button.Root variant='ghost' onClick={onCancel}>
        {t('cancel.label')}
      </Button.Root>
    </>
  );
};

const InvitationComplete = ({ statusValue }: { statusValue: number }) => {
  return statusValue > 0 ? (
    <Icon.Icon icon='ph--check--regular' size='xl' classNames='m-trim-xs' />
  ) : (
    <Icon.Icon icon='ph--x--regular' size='xl' classNames='m-trim-xs' />
  );
};

MembersContainer.displayName = 'MembersContainer';
