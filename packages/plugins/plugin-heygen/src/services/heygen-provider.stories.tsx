//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { proxyFetchLegacy } from '@dxos/edge-client';
import { Button, Input } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type GenerationOption } from './heygen-provider-types';
import { makeHeyGenProvider } from './heygen-service';

type Kind = 'avatars' | 'voices';

type Outcome = { kind: Kind; ok: true; options: GenerationOption[] } | { kind: Kind; ok: false; error: string };

// Probes candidate "owned/private" queries so we can find which HeyGen endpoint/param surfaces the
// account's own avatars/voices (the flat v3 lists return only the public catalog). Reports counts +
// sample names per candidate; whichever returns a small, account-specific set is the one to use.
const inspectRaw = async (apiKey: string): Promise<Record<string, unknown>> => {
  // Per-request timeout: `/v2/avatars` returns the full unbounded catalog and can hang, which would
  // otherwise leave the whole inspection stuck on "Inspecting…". A timed-out probe reports as status -1.
  const fetchJson = async (url: string): Promise<{ status: number; json: any }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await proxyFetchLegacy(new URL(url), { headers: { 'X-Api-Key': apiKey }, signal: controller.signal });
      let json: any = null;
      try {
        json = await res.json();
      } catch {}
      return { status: res.status, json };
    } catch (err) {
      return { status: -1, json: { error: controller.signal.aborted ? 'timed out' : String(err) } };
    } finally {
      clearTimeout(timer);
    }
  };
  const names = (entries: Array<Record<string, unknown>>): unknown[] =>
    entries.slice(0, 8).map((entry) => entry.name ?? entry.avatar_name ?? entry.talking_photo_name);
  const types = (entries: Array<Record<string, unknown>>): unknown[] => [
    ...new Set(entries.map((entry) => entry.type).filter((value) => value != null)),
  ];

  const out: Record<string, unknown> = {};

  const v3Avatars = await fetchJson('https://api.heygen.com/v3/avatars?limit=50');
  const v3AvatarData = v3Avatars.json?.data;
  const v3AvatarEntries = Array.isArray(v3AvatarData) ? v3AvatarData : (v3AvatarData?.avatars ?? []);
  out.v3_avatars = { status: v3Avatars.status, count: v3AvatarEntries.length, sampleNames: names(v3AvatarEntries) };

  // v2 splits into stock `avatars` and user-uploaded `talking_photos` (the account's own).
  const v2Avatars = await fetchJson('https://api.heygen.com/v2/avatars');
  out.v2_avatars = {
    status: v2Avatars.status,
    avatars: (v2Avatars.json?.data?.avatars ?? []).length,
    talkingPhotos: (v2Avatars.json?.data?.talking_photos ?? []).length,
    sampleTalkingPhotos: names(v2Avatars.json?.data?.talking_photos ?? []),
  };

  const v3Voices = await fetchJson('https://api.heygen.com/v3/voices?limit=100');
  out.v3_voices = {
    status: v3Voices.status,
    count: (v3Voices.json?.data ?? []).length,
    types: types(v3Voices.json?.data ?? []),
  };

  const v3VoicesPrivate = await fetchJson('https://api.heygen.com/v3/voices?limit=100&type=private');
  out.v3_voices_private = {
    status: v3VoicesPrivate.status,
    count: (v3VoicesPrivate.json?.data ?? []).length,
    types: types(v3VoicesPrivate.json?.data ?? []),
    sampleNames: names(v3VoicesPrivate.json?.data ?? []),
  };

  return out;
};

/**
 * Manual harness that exercises the live HeyGen list endpoints with a pasted API key, so the real
 * auth/CORS/response path (which the mock-fetch unit tests can't cover) is observable in the browser
 * — paste a key from https://app.heygen.com/settings, then load avatars/voices and read the outcome.
 */
const ProviderHarness = () => {
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState<Kind | undefined>(undefined);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [raw, setRaw] = useState<{ data?: unknown; message?: string }>();

  const inspect = async () => {
    const key = apiKey.trim();
    if (!key) {
      return;
    }
    setRaw({ message: 'Inspecting…' });
    try {
      setRaw({ data: await inspectRaw(key) });
    } catch (err) {
      setRaw({ message: err instanceof Error ? err.message : String(err) });
    }
  };

  const run = async (kind: Kind) => {
    const key = apiKey.trim();
    if (!key) {
      return;
    }
    setBusy(kind);
    const provider = makeHeyGenProvider();
    try {
      const options =
        kind === 'avatars' ? await provider.listAvatars({ apiKey: key }) : await provider.listVoices({ apiKey: key });
      setOutcomes((prev) => [{ kind, ok: true, options }, ...prev]);
    } catch (err) {
      setOutcomes((prev) => [{ kind, ok: false, error: err instanceof Error ? err.message : String(err) }, ...prev]);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className='dx-container flex flex-col gap-4 p-4 max-is-[40rem]'>
      <Input.Root>
        <Input.Label>HeyGen API key</Input.Label>
        <Input.TextInput
          type='password'
          noAutoFill
          placeholder='Paste API key'
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </Input.Root>
      <div className='flex gap-2'>
        <Button disabled={!apiKey.trim() || busy != null} onClick={() => run('avatars')}>
          {busy === 'avatars' ? 'Loading avatars…' : 'List avatars'}
        </Button>
        <Button disabled={!apiKey.trim() || busy != null} onClick={() => run('voices')}>
          {busy === 'voices' ? 'Loading voices…' : 'List voices'}
        </Button>
        <Button disabled={!apiKey.trim()} onClick={() => void inspect()}>
          Inspect raw fields
        </Button>
      </div>

      <div className='dx-expander flex flex-col gap-2 overflow-y-auto'>
        {raw?.data !== undefined && <JsonHighlighter data={raw.data} />}
        {raw?.message && <span className='text-sm text-description'>{raw.message}</span>}
        {outcomes.map((outcome, index) => (
          <div key={index}>
            <div>
              {outcome.kind} — {outcome.ok ? `${outcome.options.length} option(s)` : 'error'}
            </div>
            {outcome.ok ? (
              <Listbox.Root>
                <Listbox.Viewport>
                  <Listbox.Content aria-label={outcome.kind}>
                    {outcome.options.map((option) => (
                      <Listbox.Item key={option.id} id={option.id}>
                        <Listbox.ItemContent title={option.name} description={option.id} />
                      </Listbox.Item>
                    ))}
                  </Listbox.Content>
                </Listbox.Viewport>
              </Listbox.Root>
            ) : (
              <div className='text-error-text'>{outcome.error}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-heygen/HeyGenProvider',
  component: ProviderHarness,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProviderHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
