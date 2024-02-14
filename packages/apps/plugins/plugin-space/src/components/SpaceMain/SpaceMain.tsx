//
// Copyright 2023 DXOS.org
//

import { Command, Planet } from '@phosphor-icons/react';
import React from 'react';

import { type Action, useGraph } from '@braneframe/plugin-graph';
import { Surface } from '@dxos/app-framework';
import { SpaceState, type Space } from '@dxos/react-client/echo';
import { Button, Main, useTranslation, Input, DropdownMenu } from '@dxos/react-ui';
import { getSize, mx, topbarBlockPaddingStart } from '@dxos/react-ui-theme';
import { ClipboardProvider } from '@dxos/shell/react';

import { SpaceMembersSection } from './SpaceMembersSection';
import { SPACE_PLUGIN } from '../../meta';

const InFlowSpaceActions = ({ actionsMap }: { actionsMap: Record<string, Action> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <section className='mbe-4 col-start-2 col-end-4 md:col-end-7 grid gap-2 auto-rows-min grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]'>
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

const KeyShortcuts = () => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <section className='mbe-4 col-span-4 md:col-start-5 md:col-end-7 grid grid-cols-subgrid gap-y-2 auto-rows-min'>
      <h2 className='contents'>
        <Command weight='duotone' className={mx(getSize(5), 'place-self-center')} />
        <span className='text-lg col-span-2 md:col-span-1'>{t('keyshortcuts label')}</span>
      </h2>
      <div role='none' className='col-start-2 col-end-4 md:col-end-5 pie-2'>
        <Surface role='keyshortcuts' />
      </div>
    </section>
  );
};

export const SpaceMain = ({ space }: { space: Space }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const { graph } = useGraph();
  const actionsMap = graph.findNode(space.key.toHex())?.actionsMap;
  const state = space.state.get();
  const ready = state === SpaceState.READY;
  return (
    <ClipboardProvider>
      <Main.Content
        classNames={[
          topbarBlockPaddingStart,
          'min-bs-dvh grid gap-y-2 auto-rows-min',
          'grid-cols-[var(--rail-size)_var(--rail-size)_1fr_var(--rail-size)]',
          'md:grid-cols-[var(--rail-size)_var(--rail-size)_minmax(max-content,1fr)_var(--rail-size)_var(--rail-size)_minmax(max-content,2fr)_var(--rail-size)]',
        ]}
        data-testid='spacePlugin.main'
      >
        <h1 className='contents'>
          <MenuSpaceActions actionsMap={actionsMap} />
          <Input.Root>
            <Input.Label srOnly>{t('rename space label')}</Input.Label>
            <Input.TextInput
              variant='subdued'
              classNames='text-2xl text-light col-span-3 md:col-span-4'
              data-testid='spacePlugin.main.name'
              disabled={!ready}
              value={space.properties.name ?? ''}
              onChange={({ target: { value } }) => (space.properties.name = value)}
              placeholder={ready ? t('unnamed space label') : t('loading space label')}
            />
          </Input.Root>
        </h1>
        {actionsMap && <InFlowSpaceActions actionsMap={actionsMap} />}
        {ready && <SpaceMembersSection space={space} />}
        <KeyShortcuts />
      </Main.Content>
    </ClipboardProvider>
  );
};
