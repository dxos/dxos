//
// Copyright 2023 DXOS.org
//

import { CaretDown, Check, Planet, UserPlus, UsersThree } from '@phosphor-icons/react';
import React, { useCallback, useState } from 'react';

import { type Action, useGraph } from '@braneframe/plugin-graph';
import { type Space, useMembers, SpaceMember, useSpaceInvitations } from '@dxos/react-client/echo';
import { Invitation } from '@dxos/react-client/invitations';
import { Button, Main, useTranslation, Input, DropdownMenu, ButtonGroup, List } from '@dxos/react-ui';
import { descriptionText, getSize, mx, topbarBlockPaddingStart } from '@dxos/react-ui-theme';
import { InvitationListItem } from '@dxos/shell/react';

import { SPACE_PLUGIN } from '../meta';

// TODO(thure): Sync with shell?
const activeActionKeyStorageKey = 'dxos:react-shell/space-manager/active-action';

const UnusedRail = () => <div role='none' />;

const InFlowSpaceActions = ({ actionsMap }: { actionsMap: Record<string, Action> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <section className='pli-2 mbe-4 col-start-1 col-end-4 md:col-end-6 grid gap-2 auto-rows-min grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]'>
      {Object.entries(actionsMap)
        .filter(([_, { properties }]) => properties?.mainAreaDisposition === 'in-flow')
        .map(([actionId, { icon: Icon, label, invoke }]) => {
          return (
            <Button key={actionId} classNames='block text-center plb-2 font-normal' onClick={() => invoke?.()}>
              {Icon && <Icon className={mx(getSize(5), 'mli-auto')} />}
              <p>{typeof label === 'string' ? label : t(...label)}</p>
            </Button>
          );
        })}
    </section>
  );
};

const MenuSpaceActions = ({ actionsMap }: { actionsMap?: Record<string, Action> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const menuActionEntries = Object.entries(actionsMap ?? []).filter(
    ([_, { properties }]) => properties?.mainAreaDisposition === 'menu',
  );
  return menuActionEntries.length ? (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant='ghost' classNames='m-1 p-0'>
          <span className='sr-only'>{t('more actions label')}</span>
          <Planet weight='duotone' className={mx(getSize(5), 'place-self-center')} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Viewport>
          {menuActionEntries.map(([actionId, { icon: Icon, label, invoke }]) => {
            return (
              <DropdownMenu.Item key={actionId} onClick={() => invoke?.()}>
                {Icon && <Icon />}
                <span>{typeof label === 'string' ? label : t(...label)}</span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Viewport>
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  ) : (
    <Planet weight='duotone' className={mx(getSize(5), 'place-self-center')} />
  );
};

const Presence = SpaceMember.PresenceState;

const handleSend = () => {};
const handleCreateInvitationUrl = (invitationCode: string) => `${origin}?spaceInvitationCode=${invitationCode}`;

const SpaceMembers = ({ space }: { space: Space }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const invitations = useSpaceInvitations(space.key);

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
          type: Invitation.Type.MULTIUSE,
          authMethod: Invitation.AuthMethod.NONE,
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
    <section className='mbe-4 grid gap-y-2 grid-cols-[var(--rail-size)_1fr_var(--rail-size)] col-span-3 md:col-span-2 auto-rows-min'>
      <h2 className='contents'>
        <UsersThree weight='duotone' className={mx(getSize(5), 'place-self-center')} />
        <span className='text-lg'>{t('space members label')}</span>
      </h2>
      <h3 className='pli-4 col-span-2 text-sm italic fg-description'>{t('invitations heading')}</h3>
      <List classNames='pie-2 col-span-3 gap-y-2 grid grid-cols-[var(--rail-size)_1fr_var(--rail-action)_var(--rail-action)]'>
        {invitations.map((invitation) => (
          <InvitationListItem
            reverseEffects
            classNames='pis-0 pie-0 gap-0 col-span-4 grid grid-cols-subgrid'
            key={invitation.get().invitationId}
            invitation={invitation}
            send={handleSend}
            createInvitationUrl={handleCreateInvitationUrl}
          />
        ))}
      </List>
      <ButtonGroup classNames='pli-2 grid col-span-3 grid-cols-subgrid place-self-grow gap-px'>
        <Button classNames='col-span-2 grow gap-2' onClick={activeAction.onClick}>
          <activeAction.icon />
          <span>{activeAction.label}</span>
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button classNames='pli-0'>
              <CaretDown />
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
                      <p id={`${id}__label`}>{action.label}</p>
                      {action.description && (
                        <p id={`${id}__description`} className={descriptionText}>
                          {action.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu.ItemIndicator asChild>
                      <Check />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </ButtonGroup>
      <h3 className='pli-4 col-span-3 text-sm italic fg-description'>
        {t('active space members heading', { count: members[Presence.ONLINE].length })}
      </h3>
      <List classNames='contents' />
      <h3 className='pli-4 col-span-3 text-sm italic fg-description'>
        {t('inactive space members heading', { count: members[Presence.OFFLINE].length })}
      </h3>
    </section>
  );
};

export const SpaceMain = ({ space }: { space: Space }) => {
  const { graph } = useGraph();
  const actionsMap = graph.findNode(space.key.toHex())?.actionsMap;
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <Main.Content
      classNames={[
        topbarBlockPaddingStart,
        'min-bs-dvh grid gap-y-2 auto-rows-min grid-cols-[var(--rail-size)_1fr_var(--rail-size)] md:grid-cols-[var(--rail-size)_1fr_var(--rail-size)_2fr_var(--rail-size)]',
      ]}
    >
      <h1 className='contents'>
        <MenuSpaceActions actionsMap={actionsMap} />
        <Input.Root>
          <Input.Label srOnly>{t('rename space label')}</Input.Label>
          <Input.TextInput
            variant='subdued'
            classNames='text-2xl text-light md:col-span-3'
            value={space.properties.name ?? ''}
            onChange={({ target: { value } }) => (space.properties.name = value)}
            placeholder={space.key.truncate()}
          />
        </Input.Root>
      </h1>
      {actionsMap && <InFlowSpaceActions actionsMap={actionsMap} />}
      <SpaceMembers space={space} />
    </Main.Content>
  );
};
