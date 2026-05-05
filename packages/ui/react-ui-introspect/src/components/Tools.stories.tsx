//
// Copyright 2026 DXOS.org
//

// Three-pane explorer for the introspect-mcp tool surface, wired to a live
// MCP server over Streamable HTTP. Spin up the server in another terminal:
//
//   moon run introspect-mcp:serve-http
//
// then load this story. The default URL points at the configured server
// (`http://localhost:39476/mcp`); override with the `serverUrl` arg in the
// Storybook controls panel.
//
// Layout:
//
//   ┌─────────────┬────────────────────────────────┐
//   │             │            ToolForm            │
//   │  ToolList   ├────────────────────────────────┤
//   │             │           ToolResults          │
//   └─────────────┴────────────────────────────────┘

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { TOOL_METADATA } from '@dxos/introspect-mcp/tools';
import { Message } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ToolForm } from './ToolForm';
import { ToolList } from './ToolList';
import { ToolResults } from './ToolResults';

type ToolsExplorerProps = {
  /** URL of the introspect-mcp HTTP server. Default matches `moon run introspect-mcp:serve-http`. */
  serverUrl: string;
};

const ToolsExplorer = ({ serverUrl }: ToolsExplorerProps) => {
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
    const next = new Client({ name: 'react-ui-introspect-storybook', version: '0.0.0' }, { capabilities: {} });
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
    // Reset previous result when picking a new tool — stale results from a
    // different schema are confusing and can mislead debugging.
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
      <div className='p-4'>
        <Message.Root valence='error'>
          <Message.Title>Connection failed</Message.Title>
          <Message.Content>
            <p>{connectError.message}</p>
            <p className='mt-2'>
              Run <code>moon run introspect-mcp:serve-http</code> in another terminal, then reload.
            </p>
          </Message.Content>
        </Message.Root>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-[20rem_1fr] grid-rows-[1fr_1fr] h-full divide-x divide-y divide-separator'>
      <ToolList tools={TOOL_METADATA} selected={selected} onSelect={handleSelect} className='row-span-2' />
      {selectedTool ? (
        <ToolForm tool={selectedTool} onSubmit={handleSubmit} />
      ) : (
        <div className='p-3 text-sm text-description italic'>Pick a tool from the list to render its input form.</div>
      )}
      <ToolResults result={result} error={callError} loading={running} />
    </div>
  );
};

const meta: Meta<typeof ToolsExplorer> = {
  title: 'ui/react-ui-introspect/ToolsExplorer',
  component: ToolsExplorer,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'h-screen' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof ToolsExplorer>;

export const Default: Story = {
  args: {
    serverUrl: 'http://localhost:39476/mcp',
  },
};
