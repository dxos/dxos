//
// Copyright 2026 DXOS.org
//

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { MAX_LIST_LIMIT, TOOL_METADATA, type PickerKind } from '@dxos/introspect-tools';
import { Message, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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
    const [pickerOptions, setPickerOptions] = useState<Partial<Record<PickerKind, ReadonlyArray<string>>>>({});

    // One client per server URL. Re-running on URL change is rare in dev
    // (Storybook control flick) but the cleanup keeps it from leaking.
    useEffect(() => {
      let cancelled = false;
      const next = new Client({ name: 'react-ui-introspect', version: '0.0.0' }, { capabilities: {} });
      const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
      next.connect(transport).then(
        async () => {
          if (cancelled) {
            return;
          }
          setClient(next);
          setConnectError(null);
          // Best-effort warm-up of picker options. `compact: true` is
          // enough since we only need ids/names, and `MAX_LIST_LIMIT`
          // guarantees we capture every entry the server has indexed.
          const options: Partial<Record<PickerKind, ReadonlyArray<string>>> = {};
          try {
            const plugins = await next.callTool({
              name: 'list_plugins',
              arguments: { compact: true, limit: MAX_LIST_LIMIT },
            });
            const pluginIds = extractStringField(plugins, 'id');
            if (pluginIds.length) {
              options['plugin-id'] = pluginIds;
            }
          } catch {
            // Ignore — server might not implement list_plugins.
          }
          try {
            const packages = await next.callTool({
              name: 'list_packages',
              arguments: { compact: true, limit: MAX_LIST_LIMIT },
            });
            const packageNames = extractStringField(packages, 'name');
            if (packageNames.length) {
              options['package-name'] = packageNames;
            }
          } catch {
            // Ignore — server might not implement list_packages.
          }
          if (!cancelled) {
            setPickerOptions(options);
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
        <div className={mx('dx-container grid divide-y divide-separator', selectedTool && 'grid-rows-[2fr_3fr]')}>
          <ToolList tools={TOOL_METADATA} selected={selected} onSelect={handleSelect} />
          {selectedTool && <ToolForm tool={selectedTool} onSubmit={handleSubmit} pickerOptions={pickerOptions} />}
        </div>
        <ToolResults result={result} error={callError} loading={running} />
      </div>
    );
  },
);

ToolsExplorer.displayName = 'ToolsExplorer';

// Pick `field` off every record in an MCP tool response. Mirrors the
// envelope unwrap done by `ToolResults`: prefer `structuredContent`, then
// JSON-parse `content[0].text`, then peel a single-key wrapper (e.g.
// `{ plugins: [...] }`) before reading the field.
const extractStringField = (response: unknown, field: string): string[] => {
  if (!response || typeof response !== 'object') {
    return [];
  }
  const envelope = response as { structuredContent?: unknown; content?: unknown };
  let inner: unknown = envelope.structuredContent;
  if (inner === undefined && Array.isArray(envelope.content)) {
    const text = (envelope.content as Array<{ type?: string; text?: string }>).find(
      (chunk) => chunk?.type === 'text' && typeof chunk.text === 'string',
    )?.text;
    if (text !== undefined) {
      try {
        inner = JSON.parse(text);
      } catch {
        return [];
      }
    }
  }
  if (inner && typeof inner === 'object' && !Array.isArray(inner) && 'data' in (inner as object)) {
    inner = (inner as { data: unknown }).data;
  }
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const keys = Object.keys(inner as object);
    if (keys.length === 1) {
      inner = (inner as Record<string, unknown>)[keys[0]];
    }
  }
  if (!Array.isArray(inner)) {
    return [];
  }
  const values: string[] = [];
  for (const item of inner) {
    if (item && typeof item === 'object') {
      const value = (item as Record<string, unknown>)[field];
      if (typeof value === 'string') {
        values.push(value);
      }
    }
  }
  return values;
};
