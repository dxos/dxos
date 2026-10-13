//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import { hexToFallback } from '@dxos/util';

import { meta } from '#meta';

export type AgentListAdmin = {
  /** Hex identity key. */
  identityKey: string;
  name: string;
  /** Whether the admin is the viewer. */
  you?: boolean;
};

export type AgentListEntry = {
  /** The agent's own space, whose members are its admins. */
  spaceId: string;
  name: string;
  /** Hex key of the agent's own identity. */
  identityKey?: string;
  admins: AgentListAdmin[];
};

export type AgentListProps = {
  agents: AgentListEntry[];
  onOpen?: (spaceId: string) => void;
};

/** The agents the viewer administers, each with its admins and a way into its space. */
export const AgentList = ({ agents, onOpen }: AgentListProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (agents.length === 0) {
    return <p className='text-fg-muted my-2'>{t('agents-panel-empty.message')}</p>;
  }

  return (
    <Listbox.Root items={agents.map((agent) => ({ value: agent.spaceId, label: agent.name }))}>
      <Listbox.Viewport>
        <Listbox.Content classNames='flex flex-col gap-2' aria-label={t('agents-panel.label')} data-testid='agent-list'>
          {agents.map((agent) => (
            <AgentListItem key={agent.spaceId} agent={agent} onOpen={onOpen} />
          ))}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};

type AgentListItemProps = Pick<AgentListProps, 'onOpen'> & { agent: AgentListEntry };

/** The agent's avatar, its name over its admins, and the way into its space at the end. */
const AgentListItem = ({ agent, onOpen }: AgentListItemProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const labelId = Hooks.useId('agentListItem__label');
  const fallback = agent.identityKey ? hexToFallback(agent.identityKey) : undefined;
  const admins = agent.admins
    .map((admin) => (admin.you ? t('agent-admin-you.label', { name: admin.name }) : admin.name))
    .join(', ');

  return (
    <Listbox.Item classNames='p-2 rounded-sm' id={agent.spaceId} data-testid='agent-list.item'>
      <Listbox.ItemIcon>
        <Avatar.Root
          aria-labelledby={labelId}
          size='md'
          hue={fallback && Avatar.toAvatarHue(fallback.hue)}
          icon='ph--robot--regular'
        />
      </Listbox.ItemIcon>
      <Listbox.ItemText id={labelId}>{agent.name || t('agent-unnamed.label')}</Listbox.ItemText>
      <Listbox.ItemDescription classNames='pt-1'>{t('agent-admins.label', { admins })}</Listbox.ItemDescription>
      <Button.Root size='sm' onClick={() => onOpen?.(agent.spaceId)} data-testid='agent-list.open'>
        {t('agent-open-space.label')}
      </Button.Root>
    </Listbox.Item>
  );
};
