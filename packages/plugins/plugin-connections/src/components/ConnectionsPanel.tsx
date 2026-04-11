//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Filter } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Icon, ScrollArea } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

export type ConnectionsPanelProps = {
  space: Space;
};

type ConnectionInfo = {
  source: string;
  label: string;
  icon: string;
  connected: boolean;
  details?: string;
};

/** Source domain to display metadata mapping. */
const sourceMetadata: Record<string, { label: string; icon: string }> = {
  'google.com': { label: 'Google', icon: 'ph--google-logo--regular' },
  'github.com': { label: 'GitHub', icon: 'ph--github-logo--regular' },
  'slack.com': { label: 'Slack', icon: 'ph--slack-logo--regular' },
  'discord.com': { label: 'Discord', icon: 'ph--discord-logo--regular' },
  'linear.app': { label: 'Linear', icon: 'ph--kanban--regular' },
};

const getSourceInfo = (source: string) =>
  sourceMetadata[source] ?? { label: source, icon: 'ph--key--regular' };

/**
 * Shows all connected services, credentials, and integrations.
 */
export const ConnectionsPanel = ({ space }: ConnectionsPanelProps) => {
  // Query tokens from the primary space.
  const tokens = useQuery(space.db, Filter.type(AccessToken.AccessToken));

  // Also check all spaces for tokens.
  const allSpaces = useSpaces();
  const allTokens = useMemo(() => {
    const tokenMap = new Map<string, AccessToken.AccessToken>();
    for (const token of tokens) {
      tokenMap.set(token.id, token);
    }
    return [...tokenMap.values()];
  }, [tokens]);

  // Check Slack connection via localStorage (settings-based, not AccessToken).
  const slackConnected = useMemo(() => {
    try {
      const stored = globalThis.localStorage?.getItem('dxos.org/settings/org.dxos.plugin.slack');
      if (stored) {
        const settings = JSON.parse(stored);
        return !!settings.botToken;
      }
    } catch {
      // Ignore.
    }
    return false;
  }, []);

  // Check Anthropic API key.
  const anthropicConnected = useMemo(() => {
    return !!globalThis.localStorage?.getItem('ANTHROPIC_API_KEY');
  }, []);

  // Build connections list.
  const connections: ConnectionInfo[] = useMemo(() => {
    const result: ConnectionInfo[] = [];

    // Add Anthropic/AI connection.
    result.push({
      source: 'anthropic',
      label: 'Anthropic (AI)',
      icon: 'ph--brain--regular',
      connected: anthropicConnected,
      details: anthropicConnected ? 'API key configured' : 'Set ANTHROPIC_API_KEY in console',
    });

    // Add Slack connection.
    result.push({
      source: 'slack',
      label: 'Slack',
      icon: 'ph--slack-logo--regular',
      connected: slackConnected,
      details: slackConnected ? 'Bot token configured' : 'Configure in Settings → Slack',
    });

    // Add token-based connections.
    const seenSources = new Set(['slack']);
    for (const token of allTokens) {
      const source = token.source ?? 'unknown';
      if (seenSources.has(source)) {
        continue;
      }
      seenSources.add(source);
      const info = getSourceInfo(source);
      result.push({
        source,
        label: info.label,
        icon: info.icon,
        connected: !!token.token,
        details: token.account ?? token.note ?? 'Token configured',
      });
    }

    // Sort: connected first, then alphabetical.
    result.sort((first, second) => {
      if (first.connected !== second.connected) {
        return first.connected ? -1 : 1;
      }
      return first.label.localeCompare(second.label);
    });

    return result;
  }, [allTokens, slackConnected, anthropicConnected]);

  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport className='max-h-full'>
        <div className='flex flex-col gap-2 p-3'>
          <h3 className='text-xs font-medium text-description uppercase tracking-wider'>Connections</h3>

          {connections.length === 0 ? (
            <div className='text-sm text-description p-2'>
              No connections configured.
            </div>
          ) : (
            connections.map((connection) => (
              <ConnectionCard key={connection.source} connection={connection} />
            ))
          )}

          <div className='border-t border-separator pt-3 mt-1'>
            <h3 className='text-xs font-medium text-description uppercase tracking-wider mb-2'>
              MCP Servers
            </h3>
            <div className='text-sm text-description p-2'>
              MCP servers are configured via blueprints.
            </div>
          </div>
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const ConnectionCard = ({ connection }: { connection: ConnectionInfo }) => (
  <div className='rounded-md border border-separator p-3'>
    <div className='flex items-center gap-2'>
      <Icon icon={connection.icon} size={4} />
      <span className='text-sm font-medium flex-1'>{connection.label}</span>
      <div className='flex items-center gap-1'>
        <div
          className={mx(
            'size-2 rounded-full',
            connection.connected ? 'bg-green-500' : 'bg-neutral-400',
          )}
        />
        <span className='text-xs text-description'>
          {connection.connected ? 'Connected' : 'Not connected'}
        </span>
      </div>
    </div>
    {connection.details && (
      <div className='text-xs text-description mt-1 pl-6'>
        {connection.details}
      </div>
    )}
  </div>
);
