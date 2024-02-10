//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, Planet } from '@phosphor-icons/react';
import React from 'react';

import { type Action, useGraph } from '@braneframe/plugin-graph';
import { type Space } from '@dxos/react-client/echo';
import { Button, Main, useTranslation, Input, DropdownMenu } from '@dxos/react-ui';
import { getSize, mx, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';

const InFlowSpaceActions = ({ actionsMap }: { actionsMap: Record<string, Action> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <section className='mlb-4 col-start-2 md:col-end-5 grid gap-2 auto-rows-min grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]'>
      {Object.entries(actionsMap)
        .filter(([_, { properties }]) => properties?.mainAreaDisposition === 'in-flow')
        .map(([actionId, { icon: Icon, label, invoke }]) => {
          return (
            <Button key={actionId} classNames='block text-center plb-2 font-normal' onClick={() => invoke?.()}>
              {Icon && <Icon className={mx(getSize(6), 'mli-auto')} />}
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
    <div role='none' />
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
        'min-bs-dvh grid auto-rows-min grid-cols-[var(--rail-size)_1fr_var(--rail-size)] md:grid-cols-[var(--rail-size)_1fr_var(--rail-size)_2fr_var(--rail-size)]',
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
    </Main.Content>
  );
};
