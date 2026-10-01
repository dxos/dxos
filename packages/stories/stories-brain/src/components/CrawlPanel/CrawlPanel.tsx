//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, type ComponentProps, useCallback, useMemo } from 'react';

import { type ChannelInfo } from '@dxos/crawler';
import { Format } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { type FormFieldMap } from '@dxos/react-ui-form';
import { Form, createSelectField } from '@dxos/react-ui-form/next';
import { Next } from '@dxos/react-ui/next';

export const CrawlOptions = Schema.Struct({
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
    title: 'Discord bot token',
  }),
  channel: Schema.String.annotate({ title: 'Channel' }),
  maxDays: Schema.Number.annotate({ title: 'Lookback (days)' }),
  descendThreads: Schema.Boolean.annotate({ title: 'Crawl threads' }),
});
export type CrawlOptions = Schema.Schema.Type<typeof CrawlOptions>;

export type CrawlAction = 'channels' | 'crawl' | 'file' | 'generate' | 'reset' | 'sparql';

// Seed the form from Vite env (only `VITE_`-prefixed vars reach the browser). Set them when serving,
// e.g. `VITE_DISCORD_TOKEN=… VITE_DISCORD_CHANNEL=id moon run storybook-react:serve`.
export const initialOptions = (): CrawlOptions => ({
  token: String(import.meta.env.VITE_DISCORD_TOKEN ?? ''),
  channel: String(import.meta.env.VITE_DISCORD_CHANNEL ?? ''),
  maxDays: Number(import.meta.env.VITE_DISCORD_MAX_DAYS ?? 14),
  descendThreads: import.meta.env.VITE_DISCORD_THREADS !== '0',
});

export type CrawlPanelProps = ThemedClassName<{
  options: CrawlOptions;
  channels: ChannelInfo[];
  busy: CrawlAction | null;
  status?: string | null;
  error?: string | null;
  onValuesChanged: ComponentProps<typeof Form.Root>['onValuesChanged'];
  onListChannels: () => void;
  onCrawl: () => void;
  onLoadFile: (name: string, text: string) => void;
  onReset: () => void;
}>;

/**
 * Crawl control column: the Discord token + options form (with the discovered channels bound to the
 * `channel` select) and the toolbar actions. Pure/presentational — the parent owns the crawl state,
 * the semantic store, and every handler.
 */
export const CrawlPanel = ({
  classNames,
  options,
  channels,
  busy,
  status,
  error,
  onValuesChanged,
  onListChannels,
  onCrawl,
  onLoadFile,
  onReset,
}: CrawlPanelProps) => {
  // The `channel` field uses the form's built-in select, populated with the discovered channels.
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      channel: createSelectField({
        options: channels.map((channel) => ({ value: channel.id, label: channel.name ?? channel.id })),
        defaultLabel: null,
      }),
    }),
    [channels],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = ''; // Allow re-picking the same file.
      if (file) {
        void file.text().then((text) => onLoadFile(file.name, text));
      }
    },
    [onLoadFile],
  );

  return (
    <Next.Panel.Root classNames={classNames}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Button
            icon='ph--arrow-clockwise--regular'
            label='List channels'
            disabled={!options.token || !!busy}
            onClick={onListChannels}
          />
          <Next.Button
            icon='ph--bulldozer--regular'
            iconOnly
            label='Crawl'
            variant='primary'
            disabled={!options.token || !options.channel || !!busy}
            onClick={onCrawl}
          />
          <Next.SystemButton.Upload
            disabled={!!busy}
            accept='.txt,.md,text/plain,text/markdown'
            onFileChange={handleFileChange}
          />
          <Next.Toolbar.Separator />
          <Next.Button icon='ph--trash--regular' iconOnly label='Reset' disabled={!!busy} onClick={onReset} />
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        <Form.Root schema={CrawlOptions} values={options} fieldMap={fieldMap} onValuesChanged={onValuesChanged}>
          <Form.Viewport>
            <Form.Content>
              <Form.Fields />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Next.Panel.Body>
      {(error || status) && (
        <Next.Panel.Footer>
          <Next.Toolbar.Root classNames='bg-transparent'>
            <Next.Toolbar.Text classNames={[error ? 'text-error-text' : 'text-subdued']}>
              {error ?? status}
            </Next.Toolbar.Text>
          </Next.Toolbar.Root>
        </Next.Panel.Footer>
      )}
    </Next.Panel.Root>
  );
};
