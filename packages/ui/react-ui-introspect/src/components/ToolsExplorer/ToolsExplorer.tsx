//
// Copyright 2026 DXOS.org
//

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { TOOL_METADATA } from '@dxos/introspect-tools';
import { Message, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { ToolForm } from '../ToolForm';
import { ToolList } from '../ToolList';
import { ToolResults } from '../ToolResults';

// TODO(burdon): Move to config.
export const DEFAULT_INTROSPECT_MCP_URL = 'http://localhost:39476/mcp';

export type ToolsExplorerProps = ThemedClassName<{
  /** URL of the introspect-mcp HTTP server. Defaults to the configured server (`{@link DEFAULT_INTROSPECT_MCP_URL}`). */
  serverUrl?: string;
}>;

export const ToolsExplorer = composable<HTMLDivElement, ToolsExplorerProps>(
  ({ serverUrl = DEFAULT_INTROSPECT_MCP_URL, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const [selected, setSelected] = useState<string | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [connectError, setConnectError] = useState<Error | null>(null);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<unknown>(undefined);
    const [callError, setCallError] = useState<Error | null>(null);

    // One client per server URL. Re-running on URL change is rare in dev
    // (Storybook control flick) but the cleanup keeps it from leaking.
    useEffect(() => {
      let cancelled = false;
      const next = new Client({ name: 'react-ui-introspect', version: '0.0.0' }, { capabilities: {} });
      const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
      next.connect(transport).then(
        () => {
          if (!cancelled) {
            setClient(next);
            setConnectError(null);
          }
        },
        (err) => {
          if (!cancelled) {
            setConnectError(err instanceof Error ? err : new Error(String(err)));
          }
        },
      );

      return () => {
        cancelled = true;
        void next.close().catch(() => undefined);
      };
    }, [serverUrl]);

    const handleSelect = useCallback((name: string) => {
      setSelected(name);
      setResult(undefined);
      setCallError(null);
    }, []);

    const handleSubmit = useCallback(
      async (args: Record<string, unknown>) => {
        if (!client || !selected) {
          return;
        }
        setRunning(true);
        setCallError(null);
        try {
          const response = await client.callTool({ name: selected, arguments: args });
          setResult(response);
        } catch (err) {
          setCallError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setRunning(false);
        }
      },
      [client, selected],
    );

    const selectedTool = useMemo(() => (selected ? TOOL_METADATA[selected] : undefined), [selected]);

    if (connectError) {
      return (
        <div {...composableProps(props, { role: 'none' })} ref={forwardedRef}>
          <Message.Root classNames='m-4' valence='error'>
            <Message.Title>{t('connection-failed.title')}</Message.Title>
            <Message.Content>{connectError.message}</Message.Content>
          </Message.Root>
        </div>
      );
    }

    return (
      <div
        {...composableProps(props, { classNames: 'dx-container grid grid-cols-[30rem_1fr] divide-x divide-separator' })}
        ref={forwardedRef}
      >
        <div className='dx-container grid grid-rows-[1fr_2fr] divide-y divide-separator'>
          <ToolList tools={TOOL_METADATA} selected={selected} onSelect={handleSelect} />
          {selectedTool && <ToolForm tool={selectedTool} onSubmit={handleSubmit} />}
        </div>
        <div className='dx-container grid'>
          <ToolResults result={result} error={callError} loading={running} />
        </div>
      </div>
    );
  },
);

ToolsExplorer.displayName = 'ToolsExplorer';
