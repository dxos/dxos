//
// Copyright 2024 DXOS.org
//

import { CaretDown, Check, UserPlus, UsersThree } from '@phosphor-icons/react';
import React, { useCallback, useState } from 'react';

import { LayoutAction, useIntent } from '@dxos/app-framework';
import { type Space, useMembers, SpaceMember, useSpaceInvitations } from '@dxos/react-client/echo';
import { type CancellableInvitationObservable, InvitationEncoder } from '@dxos/react-client/invitations';
import { Invitation } from '@dxos/react-client/invitations';
import { Button, ButtonGroup, DropdownMenu, List, useTranslation } from '@dxos/react-ui';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { InvitationListItem, IdentityListItem } from '@dxos/shell/react';

import { SPACE_PLUGIN } from '../../meta';

// TODO(thure): Sync with shell?
const activeActionKeyStorageKey = 'dxos:react-shell/space-manager/active-action';

const Presence = SpaceMember.PresenceState;

const handleCreateInvitationUrl = (invitationCode: string) => `${origin}?spaceInvitationCode=${invitationCode}`;

const SpaceMemberList = ({ members }: { members: SpaceMember[] }) => {
  return members.length > 0 ? (
    <List classNames='col-start-2 col-end-5 gap-y-1 grid grid-cols-subgrid items-center'>
      {members.map((member) => (
        <IdentityListItem
          classNames='contents'
          key={member.identity.identityKey.toHex()}
          identity={member.identity}
          presence={member.presence}
        />
      ))}
    </List>
  ) : null;
};

export const SpaceMembersSection = ({ space }: { space: Space }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const invitations = useSpaceInvitations(space.key);
  const { dispatch } = useIntent();

  const handleCloseDialog = () =>
    dispatch({
      action: LayoutAction.SET_LAYOUT,
      data: { element: 'dialog', state: false },
    });

  const handleInvitationSelect = ({
    invitation: invitationObservable,
  }: {
    invitation: CancellableInvitationObservable;
  }) => {
    const invitation = invitationObservable.get();
    void dispatch({
      action: LayoutAction.SET_LAYOUT,
      data: {
        element: 'dialog',
        component: 'dxos.org/plugin/space/InvitationManagerDialog',
        subject: {
          invitationUrl: handleCreateInvitationUrl(InvitationEncoder.encode(invitation)),
          send: handleCloseDialog,
          status: invitation.state,
          type: invitation.type,
          authCode: invitation.authCode,
          id: invitation.invitationId,
        },
      },
    });
  };

  const inviteActions = {
    inviteOne: {
      label: t('invite one label', { ns: 'os' }),
      description: t('invite one description', { ns: 'os' }),
      icon: UserPlus,
      onClick: useCallback(() => {
        space.share?.({
          type: Invitation.Type.INTERACTIVE,
          authMethod: Invitation.AuthMethod.SHARED_SECRET,
        });
      }, [space]),
    },
    inviteMany: {
      label: t('invite many label', { ns: 'os' }),
      description: t('invite many description', { ns: 'os' }),
      icon: UsersThree,
      onClick: useCallback(() => {
        space.share?.({
          type: Invitation.Type.INTERACTIVE,
          authMethod: Invitation.AuthMethod.NONE,
          multiUse: true,
        });
      }, [space]),
    },
  };

  const [activeActionKey, setInternalActiveActionKey] = useState<keyof typeof inviteActions>(
    (localStorage.getItem(activeActionKeyStorageKey) as keyof typeof inviteActions) ?? 'inviteOne',
  );
  const setActiveActionKey = (nextKey: keyof typeof inviteActions) => {
    setInternalActiveActionKey(nextKey);
    localStorage.setItem(activeActionKeyStorageKey, nextKey);
  };

  const activeAction = inviteActions[activeActionKey as keyof typeof inviteActions] ?? {};

  // TODO(thure): Simplify when Object.groupBy() is supported by Safari
  //  https://caniuse.com/mdn-javascript_builtins_object_groupby
  const members = useMembers(space.key).reduce(
    (acc: Record<SpaceMember.PresenceState, SpaceMember[]>, member) => {
      acc[member.presence].push(member);
      return acc;
    },
    {
      [Presence.ONLINE]: [],
      [Presence.OFFLINE]: [],
      [Presence.REMOVED]: [],
    },
  );

  return (
    <section className='mbe-4 col-span-3 grid gap-y-2 grid-cols-subgrid auto-rows-min'>
      <h2 className='contents'>
        <UsersThree weight='duotone' className={mx(getSize(5), 'place-self-center')} />
        <span className='text-lg col-span-2'>{t('space members label')}</span>
      </h2>
      <h3 className='col-start-2 col-span-3 text-sm italic fg-description'>{t('invitations heading')}</h3>
      {invitations.length > 0 && (
        <List classNames='col-start-2 col-span-2 gap-y-2 grid grid-cols-[var(--rail-size)_1fr_var(--rail-action)_var(--rail-action)]'>
          {invitations.map((invitation) => (
            <InvitationListItem
              reverseEffects
              classNames='pis-0 pie-0 gap-0 col-span-4 grid grid-cols-subgrid'
              key={invitation.get().invitationId}
              invitation={invitation}
              send={handleInvitationSelect}
              createInvitationUrl={handleCreateInvitationUrl}
            />
          ))}
        </List>
      )}
      <ButtonGroup classNames='col-start-2 col-end-4 grid grid-cols-[1fr_var(--rail-action)] place-self-grow gap-px'>
        <Button classNames='gap-2' onClick={activeAction.onClick}>
          <activeAction.icon className={getSize(5)} />
          <span>{t(activeAction.label, { ns: 'os' })}</span>
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button classNames='pli-0'>
              <CaretDown className={getSize(4)} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              {Object.entries(inviteActions).map(([id, action]) => {
                return (
                  <DropdownMenu.CheckboxItem
                    key={id}
                    aria-labelledby={`${id}__label`}
                    aria-describedby={`${id}__description`}
                    checked={activeActionKey === id}
                    onCheckedChange={(checked) => checked && setActiveActionKey(id as keyof typeof inviteActions)}
                    classNames='gap-2'
                  >
                    {action.icon && <action.icon className={getSize(5)} />}
                    <div role='none' className='flex-1 min-is-0 space-b-1'>
                      <p id={`${id}__label`}>{t(action.label, { ns: 'os' })}</p>
                      {action.description && (
                        <p id={`${id}__description`} className={descriptionText}>
                          {t(action.description, { ns: 'os' })}
                        </p>
                      )}
                    </div>
                    <DropdownMenu.ItemIndicator asChild>
                      <Check className={getSize(4)} />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </ButtonGroup>
      {members[Presence.ONLINE].length + members[Presence.OFFLINE].length < 1 ? (
        <p className={mx(descriptionText, 'text-center is-full mlb-2')}>
          {t('empty space members message', { ns: 'os' })}
        </p>
      ) : (
        <>
          <h3 className='col-start-2 col-end-5 text-sm italic fg-description'>
            {t('active space members heading', { count: members[Presence.ONLINE].length })}
          </h3>
          <SpaceMemberList members={members[Presence.ONLINE]} />
          <h3 className='col-start-2 col-end-5 text-sm italic fg-description'>
            {t('inactive space members heading', { count: members[Presence.OFFLINE].length })}
          </h3>
          <SpaceMemberList members={members[Presence.OFFLINE]} />
        </>
      )}
    </section>
  );
};
