//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, type ComponentProps, useMemo, useRef } from 'react';

import { type ChannelInfo } from '@dxos/crawler';
import { Format } from '@dxos/echo';
import { IconButton, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Form, type FormFieldMap, createSelectField } from '@dxos/react-ui-form';

export const CrawlOptions = Schema.Struct({
  token: Schema.String.annotations({ title: 'Discord bot token' }).pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Password),
  ),
  channel: Schema.String.annotations({ title: 'Channel' }),
  maxDays: Schema.Number.annotations({ title: 'Lookback (days)' }),
  descendThreads: Schema.Boolean.annotations({ title: 'Crawl threads' }),
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
  classNames,
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

  // Hidden file input opened by the toolbar button; read the picked .txt/.md as text and hand it up.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Allow re-picking the same file.
    if (file) {
      void file.text().then((text) => onLoadFile(file.name, text));
    }
  };

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton
            icon='ph--arrow-clockwise--regular'
            label='List channels'
            disabled={!options.token || !!busy}
            onClick={onListChannels}
          />
          <IconButton
            icon='ph--bulldozer--regular'
            iconOnly
            label='Crawl'
            variant='primary'
            disabled={!options.token || !options.channel || !!busy}
            onClick={onCrawl}
          />
          <IconButton
            icon='ph--file-arrow-up--regular'
            iconOnly
            label='Load file'
            disabled={!!busy}
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type='file'
            accept='.txt,.md,text/plain,text/markdown'
            className='sr-only'
            onChange={handleFileChange}
          />
          <Toolbar.Separator />
          <IconButton icon='ph--trash--regular' iconOnly label='Reset' disabled={!!busy} onClick={onReset} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='dx-container'>
        <Form.Root schema={CrawlOptions} values={options} fieldMap={fieldMap} onValuesChanged={onValuesChanged}>
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Content>
      {(error || status) && (
        <Panel.Statusbar asChild>
          <Toolbar.Root classNames='bg-transparent'>
            <Toolbar.Text classNames={[error ? 'text-error-text' : 'text-subdued-text']}>
              {error ?? status}
            </Toolbar.Text>
          </Toolbar.Root>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
