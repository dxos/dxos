//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Filter } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Icon, ScrollArea } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

export type ConnectionsPanelProps = {
  space: Space;
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
 * Shows all connected services, credentials, and MCP servers.
 */
export const ConnectionsPanel = ({ space }: ConnectionsPanelProps) => {
  const tokens = useQuery(space.db, Filter.type(AccessToken.AccessToken));

  const grouped = useMemo(() => {
    const groups = new Map<string, (typeof tokens)[number][]>();
    for (const token of tokens) {
      const source = token.source ?? 'unknown';
      if (!groups.has(source)) {
        groups.set(source, []);
      }
      groups.get(source)!.push(token);
    }
    return [...groups.entries()].sort(([sourceA], [sourceB]) => sourceA.localeCompare(sourceB));
  }, [tokens]);

  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport className='max-h-full'>
        <div className='flex flex-col gap-3 p-3'>
          <h3 className='text-xs font-medium text-description uppercase tracking-wider'>Connections</h3>

          {grouped.length === 0 ? (
            <div className='text-sm text-description p-2'>
              No connections configured. Add credentials in Settings to connect your agent to external services.
            </div>
          ) : (
            grouped.map(([source, sourceTokens]) => (
              <ConnectionCard key={source} source={source} tokens={sourceTokens} />
            ))
          )}

          <div className='border-t border-separator pt-3 mt-1'>
            <h3 className='text-xs font-medium text-description uppercase tracking-wider mb-2'>
              MCP Servers
            </h3>
            <div className='text-sm text-description p-2'>
              MCP servers are configured via blueprints. Open a blueprint to manage MCP connections.
            </div>
          </div>
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const ConnectionCard = ({
  source,
  tokens,
}: {
  source: string;
  tokens: AccessToken.AccessToken[];
}) => {
  const { label, icon } = getSourceInfo(source);
  const hasToken = tokens.some((token) => token.token);

  return (
    <div className='rounded-md border border-separator p-3'>
      <div className='flex items-center gap-2 mb-2'>
        <Icon icon={icon} size={4} />
        <span className='text-sm font-medium flex-1'>{label}</span>
        <div className='flex items-center gap-1'>
          <div
            className={mx(
              'size-2 rounded-full',
              hasToken ? 'bg-green-500' : 'bg-neutral-400',
            )}
          />
          <span className='text-xs text-description'>
            {hasToken ? 'Connected' : 'No token'}
          </span>
        </div>
      </div>

      {tokens.map((token, index) => (
        <div key={index} className='flex items-center gap-2 text-xs text-description pl-6'>
          {token.account && <span>{token.account}</span>}
          {token.note && <span className='italic'>{token.note}</span>}
          {!token.account && !token.note && <span>Token configured</span>}
        </div>
      ))}
    </div>
  );
};
