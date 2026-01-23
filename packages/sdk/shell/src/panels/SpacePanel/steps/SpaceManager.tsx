//
// Copyright 2023 DXOS.org
//

import React, { type Dispatch, type FC, type SetStateAction, useCallback, useState } from 'react';

import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { useSpaceInvitations } from '@dxos/react-client/echo';
import { type CancellableInvitationObservable, Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { ScrollArea, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/ui-theme';

import {
  type ActionMenuItem,
  Actions,
  BifurcatedAction,
  InvitationList,
  type InvitationListProps,
  SpaceMemberList,
  type SpaceMemberListProps,
} from '../../../components';
import { translationKey } from '../../../translations';
import { type SpacePanelStepProps } from '../SpacePanelProps';

export type SpaceManagerImplProps = SpacePanelStepProps & {
  target?: string;
  invitations?: CancellableInvitationObservable[];
  showInactiveInvitations?: boolean;
  inviteActions?: Record<string, ActionMenuItem>;
  SpaceMemberList?: FC<SpaceMemberListProps>;
  InvitationList?: FC<InvitationListProps>;
};

const activeActionKey = 'dxos:react-shell/space-manager/active-action';

const handleInvitationEvent = (invitation: Invitation, subscription: ZenObservable.Subscription) => {
  const invitationCode = InvitationEncoder.encode(invitation);
  if (invitation.state === Invitation.State.CONNECTING) {
    log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    subscription.unsubscribe();
  }
};

export type SpaceManagerProps = SpaceManagerImplProps & {};

export const SpaceManager = (props: SpaceManagerProps) => {
  const { space, target } = props;
  const { t } = useTranslation(translationKey);
  const config = useConfig();

  const invitations = useSpaceInvitations(space?.key);

  const inviteActions = {
    inviteOne: {
      label: t('invite one label'),
      description: t('invite one description'),
      icon: 'ph--user-plus--regular',
      testId: 'spaces-panel.invite-one',
      onClick: useCallback(() => {
        const invitation = space.share?.({
          type: Invitation.Type.INTERACTIVE,
          authMethod: Invitation.AuthMethod.SHARED_SECRET,
          multiUse: false,
          target,
        });
        if (invitation && config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
          const subscription: ZenObservable.Subscription = invitation.subscribe((invitation) =>
            handleInvitationEvent(invitation, subscription),
          );
        }
      }, [space, target]),
    },
    inviteMany: {
      label: t('invite many label'),
      description: t('invite many description'),
      icon: 'ph--users-three--regular',
      testId: 'spaces-panel.invite-many',
      onClick: useCallback(() => {
        const invitation = space.share?.({
          type: Invitation.Type.DELEGATED,
          authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
          multiUse: true,
          target,
        });
        if (invitation && config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production') {
          const subscription: ZenObservable.Subscription = invitation.subscribe((invitation) =>
            handleInvitationEvent(invitation, subscription),
          );
        }
      }, [space, target]),
    },
  };

  return <SpaceManagerImpl {...props} invitations={invitations} inviteActions={inviteActions} />;
};

const headingFragment = 'pis-3 pie-1 plb-1 mbe-1 font-medium';

export const SpaceManagerImpl = (props: SpaceManagerImplProps) => {
  const {
    active,
    space,
    createInvitationUrl,
    send,
    inviteActions: propsInviteActions,
    invitations,
    showInactiveInvitations,
    SpaceMemberList: SpaceMemberListComponent = SpaceMemberList,
    InvitationList: InvitationListComponent = InvitationList,
  } = props;
  const { t } = useTranslation(translationKey);

  const inviteActions =
    propsInviteActions ??
    ({
      noopInvite: {
        label: t('create space invitation label'),
        description: '',
        icon: 'ph--placeholder--regular',
        onClick: () => {},
      },
    } as Record<string, ActionMenuItem>);

  const [activeAction, setInternalActiveAction] = useState(localStorage.getItem(activeActionKey) ?? 'inviteMany');

  const setActiveAction = (nextAction: string) => {
    setInternalActiveAction(nextAction);
    localStorage.setItem(activeActionKey, nextAction);
  };

  const visibleInvitations = showInactiveInvitations
    ? invitations
    : invitations?.filter((invitation) => ![Invitation.State.CANCELLED].includes(invitation.get().state));

  return (
    <>
      <ScrollArea.Root classNames='grow shrink basis-28 -mli-2'>
        <ScrollArea.Viewport classNames='is-full pie-2'>
          {!!visibleInvitations?.length && (
            <>
              <h3 className={mx(headingFragment, descriptionText)}>{t('invitation list heading')}</h3>
              <InvitationListComponent
                className='mb-2'
                send={send}
                invitations={visibleInvitations ?? []}
                onClickRemove={(invitation) => invitation.cancel()}
                createInvitationUrl={createInvitationUrl}
              />
              <h3 className={mx(headingFragment, descriptionText, 'mbs-2')}>{t('space member list heading')}</h3>
            </>
          )}
          <SpaceMemberListComponent spaceKey={space.key} includeSelf />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation='vertical'>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <Actions>
        <BifurcatedAction
          disabled={!active}
          actions={inviteActions}
          activeAction={activeAction}
          onChangeActiveAction={setActiveAction as Dispatch<SetStateAction<string>>}
          data-testid='spaces-panel.create-invitation'
        />
      </Actions>
    </>
  );
};
