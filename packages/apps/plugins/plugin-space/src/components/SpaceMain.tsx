//
// Copyright 2023 DXOS.org
//

import { CaretDown, DotsThreeVertical, Planet, UsersThree } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { type Action, useGraph } from '@braneframe/plugin-graph';
import { type Space, useMembers, SpaceMember, useSpaceInvitations } from '@dxos/react-client/echo';
import { Button, Main, useTranslation, Input, DropdownMenu, ButtonGroup, List } from '@dxos/react-ui';
import { getSize, mx, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';

// TODO(thure): Sync with shell?
const activeActionKey = 'dxos:react-shell/space-manager/active-action';

const UnusedRail = () => <div role='none' />;

const InFlowSpaceActions = ({ actionsMap }: { actionsMap: Record<string, Action> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <section className='pli-2 mbe-2 col-start-1 col-end-4 md:col-end-6 grid gap-2 auto-rows-min grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]'>
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
          <DotsThreeVertical />
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
    <UnusedRail />
  );
};

const Presence = SpaceMember.PresenceState;

const SpaceMembers = ({ space }: { space: Space }) => {
  const [activeAction, _setInternalActiveAction] = useState(localStorage.getItem(activeActionKey) ?? 'inviteOne');
  const { t } = useTranslation(SPACE_PLUGIN);
  const _invitations = useSpaceInvitations(space.key);

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
    <section className='grid gap-y-2 grid-cols-subgrid col-span-3 md:col-span-2 auto-rows-min'>
      <h2 className='contents'>
        <UsersThree weight='duotone' className={mx(getSize(5), 'place-self-center')} />
        <span className='text-lg'>{t('space members label')}</span>
      </h2>
      <h3 className='pli-4 col-span-2 text-sm italic fg-description'>{t('invitations heading')}</h3>
      <ButtonGroup classNames='pli-2 grid col-span-3 grid-cols-subgrid md:flex md:grid-cols-1 md:col-span-2 place-self-grow gap-px'>
        <Button classNames='col-span-2 grow'>{activeAction}</Button>
        <Button classNames='p-0 md:pli-4'>
          <CaretDown />
        </Button>
      </ButtonGroup>
      <h3 className='pli-4 col-span-2 text-sm italic fg-description'>
        {t('active space members heading', { count: members[Presence.ONLINE].length })}
      </h3>
      <List classNames='contents' />
      <h3 className='pli-4 col-span-2 text-sm italic fg-description'>
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
        'min-bs-dvh grid gap-y-2 md:gap-y-4 auto-rows-min grid-cols-[var(--rail-size)_1fr_var(--rail-size)] md:grid-cols-[var(--rail-size)_1fr_var(--rail-size)_2fr_var(--rail-size)]',
      ]}
    >
      <h1 className='contents'>
        <Planet weight='duotone' className={mx(getSize(5), 'place-self-center')} />
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
      <MenuSpaceActions actionsMap={actionsMap} />
      {actionsMap && <InFlowSpaceActions actionsMap={actionsMap} />}
      <SpaceMembers space={space} />
    </Main.Content>
  );
};
