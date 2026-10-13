//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';
import { getHashStyles } from '@dxos/ui-theme';
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
  /** The agent's identity DID. */
  did?: string;
  admins: AgentListAdmin[];
};

/** The agents whose name or DID contains the filter, ignoring case. */
export const filterAgents = (agents: readonly AgentListEntry[], filter: string): AgentListEntry[] => {
  const query = filter.trim().toLowerCase();
  return query
    ? agents.filter(
        (agent) => agent.name.toLowerCase().includes(query) || (agent.did?.toLowerCase().includes(query) ?? false),
      )
    : [...agents];
};

export type AgentListProps = Util.ThemedClassName<{
  agents: AgentListEntry[];
  filter?: string;
  onOpen?: (spaceId: string) => void;
}>;

/** The agents the viewer administers, laid out as the contacts book lays out people. */
export const AgentList = ({ classNames, agents, filter = '', onOpen }: AgentListProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const visible = useMemo(
    () => filterAgents(agents, filter).sort((left, right) => left.name.localeCompare(right.name)),
    [agents, filter],
  );

  if (visible.length === 0) {
    return (
      <p className='text-fg-muted text-center my-2'>
        {t(agents.length === 0 ? 'agents-panel-empty.message' : 'agents-panel-no-match.message')}
      </p>
    );
  }

  return (
    <Listbox.Root items={visible.map((agent) => ({ value: agent.spaceId, label: agent.name }))}>
      <Listbox.Viewport>
        <Listbox.Content
          classNames={[classNames, 'flex flex-col gap-2']}
          aria-label={t('agents-panel.label')}
          data-testid='agent-list'
        >
          {visible.map((agent) => (
            <AgentListItem key={agent.spaceId} agent={agent} onOpen={onOpen} />
          ))}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};

type AgentListItemProps = Pick<AgentListProps, 'onOpen'> & { agent: AgentListEntry };

/**
 * The avatar in the icon rail, the name over its space and its admins, and the DID with its copy button at the end:
 * a contact's row, with the agent's own space where a contact's shared spaces go.
 */
const AgentListItem = ({ agent, onOpen }: AgentListItemProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const labelId = Hooks.useId('agentListItem__label');
  const fallback = agent.identityKey ? hexToFallback(agent.identityKey) : undefined;
  const name = agent.name || t('agent-unnamed.label');
  const admins = agent.admins
    .map((admin) => (admin.you ? t('agent-admin-you.label', { name: admin.name }) : admin.name))
    .join(', ');
  const identifier = agent.did ?? agent.identityKey;

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
      <Listbox.ItemText id={labelId}>{name}</Listbox.ItemText>
      <Listbox.ItemDescription classNames='flex flex-wrap items-center gap-2 pt-2'>
        <Button.Root
          size='sm'
          hue={getHashStyles(agent.spaceId).hue}
          onClick={() => onOpen?.(agent.spaceId)}
          data-testid='agent-list.space'
        >
          {name}
        </Button.Root>
        <span className='text-sm text-fg-muted'>{t('agent-admins.label', { admins })}</span>
      </Listbox.ItemDescription>
      {identifier && (
        <Layout.Flex align='center' gap='xs' classNames='text-sm text-fg-muted'>
          <Tooltip.Trigger asChild content={t(agent.did ? 'agent-did.label' : 'agent-key.label')}>
            <span className='font-mono truncate max-w-48'>{identifier}</span>
          </Tooltip.Trigger>
          <SystemButton.Clipboard
            iconOnly
            size='sm'
            variant='ghost'
            value={identifier}
            label={t(agent.did ? 'agent-copy-did.label' : 'agent-copy-key.label')}
          />
        </Layout.Flex>
      )}
    </Listbox.Item>
  );
};
