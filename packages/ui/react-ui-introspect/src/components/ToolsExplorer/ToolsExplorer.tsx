//
// Copyright 2026 DXOS.org
//

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { MAX_LIST_LIMIT, type PickerKind, TOOL_METADATA } from '@dxos/introspect-tools';
import { Banner, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { ToolForm } from '../ToolForm';
import { ToolList } from '../ToolList';
import { ToolResults } from '../ToolResults';

export type ToolsExplorerProps = ThemedClassName<{
  /** URL of the introspect-mcp HTTP server. Renders an unconfigured state when absent. */
  serverUrl?: string;
}>;

export const ToolsExplorer = composable<HTMLDivElement, ToolsExplorerProps>(({ serverUrl, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const [selected, setSelected] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [connectError, setConnectError] = useState<Error | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(undefined);
  const [callError, setCallError] = useState<Error | null>(null);
  const [pickerOptions, setPickerOptions] = useState<Partial<Record<PickerKind, ReadonlyArray<string>>>>({});

  // Render-side only: tells an absent endpoint (unconfigured) from a malformed one, which the config
  // can now carry. The effect re-parses rather than sharing a `URL` object, whose identity is not a
  // sound effect key.
  const urlError = useMemo<Error | undefined>(() => {
    if (!serverUrl) {
      return undefined;
    }
    try {
      void new URL(serverUrl);
      return undefined;
    } catch (err) {
      return err instanceof Error ? err : new Error(String(err));
    }
  }, [serverUrl]);

  // One client per server URL, keyed on the string: a memoized `URL` is a fresh identity whenever
  // React discards the memo cache, which would tear down and reopen the MCP session against an
  // unchanged endpoint.
  useEffect(() => {
    if (!serverUrl) {
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(serverUrl);
    } catch {
      // Reported through `urlError`; there is nothing to connect to.
      return;
    }
    let cancelled = false;
    const next = new Client({ name: 'react-ui-introspect', version: '0.0.0' }, { capabilities: {} });
    const transport = new StreamableHTTPClientTransport(parsed);
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
      // Clear both: without this a URL change renders the tool list against the closed previous
      // client and can attribute the old error to the new endpoint.
      setClient(null);
      setConnectError(null);
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

  if (!serverUrl) {
    return (
      <div {...composableProps(props, { role: 'none' })} ref={forwardedRef}>
        <Banner.Root valence='info'>
          <Banner.Content classNames='m-trim-md'>
            <Banner.Title>{t('not-configured.title')}</Banner.Title>
            <Banner.Body>{t('not-configured.message')}</Banner.Body>
          </Banner.Content>
        </Banner.Root>
      </div>
    );
  }

  // A malformed configured URL reads as a connection failure rather than throwing into the nearest
  // error boundary.
  const error = urlError ?? connectError;
  if (error) {
    return (
      <div {...composableProps(props, { role: 'none' })} ref={forwardedRef}>
        <Banner.Root valence='error'>
          <Banner.Content classNames='m-trim-md'>
            <Banner.Title>{t('connection-failed.title')}</Banner.Title>
            <Banner.Body>{error.message}</Banner.Body>
          </Banner.Content>
        </Banner.Root>
      </div>
    );
  }

  return (
    <div
      {...composableProps(props, { classNames: 'dx-expand grid grid-cols-[30rem_1fr] divide-x divide-separator' })}
      ref={forwardedRef}
    >
      <div className={mx('dx-expand grid divide-y divide-subdued-separator', selectedTool && 'grid-rows-[2fr_3fr]')}>
        <ToolList tools={TOOL_METADATA} selected={selected} onSelect={handleSelect} />
        {selectedTool && <ToolForm tool={selectedTool} onSubmit={handleSubmit} pickerOptions={pickerOptions} />}
      </div>
      <ToolResults result={result} error={callError} loading={running} />
    </div>
  );
});

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
