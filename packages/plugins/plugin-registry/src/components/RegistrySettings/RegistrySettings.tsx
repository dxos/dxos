//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { log } from '@dxos/log';
import { Form } from '@dxos/react-ui-form';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { meta } from '#meta';
import { RegistrySettingsSchema, type RegistrySettings as RegistrySettingsType } from '#types';

export type RegistrySettingsProps = AppSurface.SettingsProps<
  RegistrySettingsType,
  {
    activeDevPluginIds: readonly string[];
    onEnableDev: (url: string) => Promise<void>;
    onDisableDev: (id: string) => Promise<void>;
    /** Whether this device uses its own plugin set rather than the account's; `undefined` hides the section. */
    pluginScopeLocal?: boolean;
    onPluginScopeLocalChange?: (local: boolean) => void;
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
 * The URL input and toggle are rendered as `Form.Field` action rows (not schema
 * fields): the input needs a dynamic disabled state and the toggle runs async
 * enable/disable side effects, neither of which a plain schema field expresses.
 */
export const RegistrySettings = ({
  settings,
  onSettingsChange,
  activeDevPluginIds,
  onEnableDev,
  onDisableDev,
  pluginScopeLocal,
  onPluginScopeLocalChange,
  scope,
}: RegistrySettingsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [rejoining, setRejoining] = useState(false);
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
          {pluginScopeLocal !== undefined && (
            <Form.FieldSet label={t('plugin-registry.label')} actions={scope}>
              <Form.Field label={t('plugin-scope.label')} description={t('plugin-scope.description')}>
                <Field.Root>
                  <Input.Switch
                    data-testid='registrySettings.pluginScope'
                    // The scope is still worth showing without a handler; flipping it is not.
                    disabled={!onPluginScopeLocalChange}
                    checked={pluginScopeLocal}
                    // Only rejoining asks: it replaces this device's choices with the account's.
                    onCheckedChange={({ checked: local }) =>
                      local ? onPluginScopeLocalChange?.(true) : setRejoining(true)
                    }
                  />
                </Field.Root>
              </Form.Field>
            </Form.FieldSet>
          )}
          <Form.FieldSet label={t('dev-plugin.section.title')}>
            <Banner.Root valence='neutral'>
              <Banner.Body>{t('dev-plugin.description')}</Banner.Body>
            </Banner.Root>
            <Form.Field label={t('dev-plugin.url.label')} description={t('dev-plugin.url.description')}>
              <Input.Root
                data-testid='registrySettings.devPluginUrl'
                disabled={!onSettingsChange || enabled || busy}
                value={url}
                onChange={(event) =>
                  onSettingsChange?.((current) => ({ ...current, devPluginUrl: event.target.value }))
                }
              />
            </Form.Field>
            <Form.Field
              standalone
              label={t('dev-plugin.toggle.label')}
              description={t('dev-plugin.toggle.description')}
            >
              <Button.Root
                data-testid='registrySettings.devPluginToggle'
                variant={enabled ? undefined : 'primary'}
                disabled={!onSettingsChange || busy || (!enabled && !trimmedUrl)}
                onClick={() => void handleToggle()}
              >
                {buttonLabel}
              </Button.Root>
            </Form.Field>
            {enabled && !loadedDevId && !busy && (
              <Banner.Root valence='warning'>
                <Banner.Body>{t('dev-plugin.not-loaded.message')}</Banner.Body>
              </Banner.Root>
            )}
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
      <AlertDialog.Root open={rejoining} onOpenChange={({ open }) => setRejoining(open)}>
        <AlertDialog.Content>
          <AlertDialog.Body>
            <AlertDialog.Title>{t('plugin-scope.rejoin-dialog.title')}</AlertDialog.Title>
            <AlertDialog.Description>{t('plugin-scope.rejoin-dialog.description')}</AlertDialog.Description>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <div className='grow' />
            <AlertDialog.Cancel>{t('plugin-scope.rejoin-dialog.cancel.label')}</AlertDialog.Cancel>
            <AlertDialog.Action
              data-testid='registrySettings.pluginScope.confirm'
              variant='primary'
              onClick={() => {
                onPluginScopeLocalChange?.(false);
                setRejoining(false);
              }}
            >
              {t('plugin-scope.rejoin-dialog.confirm.label')}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Form.Root>
  );
};
