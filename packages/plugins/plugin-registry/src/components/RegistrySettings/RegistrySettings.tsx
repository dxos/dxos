//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { log } from '@dxos/log';
import { Button, Input, Message, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { type RegistrySettings as RegistrySettingsType, RegistrySettingsSchema } from '../../types';

export type RegistrySettingsProps = AppSurface.SettingsProps<
  RegistrySettingsType,
  {
    activeDevPluginIds: readonly string[];
    onEnableDev: (url: string) => Promise<void>;
    onDisableDev: (id: string) => Promise<void>;
  }
>;

/**
 * Settings panel for `@dxos/plugin-registry`. The dev-plugin section lets a
 * plugin author point Composer at a local Vite dev server (defaults to
 * `localhost:3967`) and toggle the dev plugin on/off persistently — boot will
 * re-attach it on the next reload, surviving HMR-triggered reloads. If the
 * dev server is offline at boot, the toggle stays on and a warning is logged
 * (the manager's `failed` atom also surfaces a badge on the plugin list).
 *
 * The URL input and toggle are rendered as `Form.Row` action rows (not schema
 * fields): the input needs a dynamic disabled state and the toggle runs async
 * enable/disable side effects, neither of which a plain schema field expresses.
 */
export const RegistrySettings = ({
  settings,
  onSettingsChange,
  activeDevPluginIds,
  onEnableDev,
  onDisableDev,
}: RegistrySettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [busy, setBusy] = useState(false);
  const enabled = !!settings.devPluginEnabled;
  const url = settings.devPluginUrl ?? '';
  const trimmedUrl = url.trim();
  const loadedDevId = activeDevPluginIds[0];

  const handleToggle = useCallback(async () => {
    if (busy || !onSettingsChange) {
      return;
    }
    setBusy(true);
    try {
      if (enabled && loadedDevId) {
        await onDisableDev(loadedDevId);
        onSettingsChange((current) => ({ ...current, devPluginEnabled: false }));
      } else if (enabled) {
        // Toggle is on but no dev plugin is currently loaded (boot-time load
        // failed or hasn't finished). Treat the click as "turn it off."
        onSettingsChange((current) => ({ ...current, devPluginEnabled: false }));
      } else {
        if (!trimmedUrl) {
          return;
        }
        // Optimistically persist intent so the next reload retries even if
        // the page closes mid-load.
        onSettingsChange((current) => ({ ...current, devPluginEnabled: true }));
        try {
          await onEnableDev(trimmedUrl);
        } catch (error) {
          // Per product direction: leave the intent on, log the failure. The
          // user explicitly turns it off if they're done iterating.
          log.warn('dev plugin enable failed', { url: trimmedUrl, error });
        }
      }
    } finally {
      setBusy(false);
    }
  }, [busy, enabled, loadedDevId, onSettingsChange, onDisableDev, onEnableDev, trimmedUrl]);

  // Button label tracks the persisted intent, not the current load state, so
  // a transient "intent on but not loaded" combination still reads as
  // "Disable Dev Plugin" — clicking it turns the intent off cleanly.
  const buttonLabel = busy
    ? t('dev-plugin.busy.label')
    : enabled
      ? t('dev-plugin.disable.label')
      : t('dev-plugin.enable.label');

  return (
    <Form.Root variant='settings' readonly={!onSettingsChange} schema={RegistrySettingsSchema} values={settings}>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('dev-plugin.section.title')}>
            <Message.Root valence='neutral'>
              <Message.Content>{t('dev-plugin.description')}</Message.Content>
            </Message.Root>
            <Form.Row label={t('dev-plugin.url.label')} description={t('dev-plugin.url.description')}>
              <Input.Root>
                <Input.TextInput
                  disabled={!onSettingsChange || enabled || busy}
                  value={url}
                  onChange={(event) =>
                    onSettingsChange?.((current) => ({ ...current, devPluginUrl: event.target.value }))
                  }
                />
              </Input.Root>
            </Form.Row>
            <Form.Row label={t('dev-plugin.toggle.label')} description={t('dev-plugin.toggle.description')}>
              <Button
                variant={enabled ? undefined : 'primary'}
                disabled={!onSettingsChange || busy || (!enabled && !trimmedUrl)}
                onClick={() => void handleToggle()}
              >
                {buttonLabel}
              </Button>
            </Form.Row>
            {enabled && !loadedDevId && !busy && (
              <Message.Root valence='warning'>
                <Message.Content>{t('dev-plugin.not-loaded.message')}</Message.Content>
              </Message.Root>
            )}
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
