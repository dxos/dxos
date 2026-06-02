//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { ClientCapabilities } from '@dxos/plugin-client';
import { useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { NotificationsCapabilities, type Settings } from '#types';
import { enablePreset, findRuleForPreset, getRulesSpace, reindexNotifications, removeRule, rulesQuery } from '../../notification-rules';
import { isWebPushSupported, registerForPush, unregisterPush } from '../../push-manager';

export type NotificationsSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const NotificationsSettings = ({ settings, onSettingsChange }: NotificationsSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const client = useCapability(ClientCapabilities.Client);
  const presets = useCapabilities(NotificationsCapabilities.RulePresets);
  const [pending, setPending] = useState(false);

  const supported = isWebPushSupported() || typeof (globalThis as any).__TAURI__ !== 'undefined';
  const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  const rulesSpace = getRulesSpace(client);
  const rules = useQuery(rulesSpace, rulesQuery());

  const onEnable = async () => {
    setPending(true);
    try {
      await registerForPush(client);
      onSettingsChange?.({ ...settings, enabled: true });
    } finally {
      setPending(false);
    }
  };

  const onDisable = async () => {
    setPending(true);
    try {
      await unregisterPush(client);
      onSettingsChange?.({ ...settings, enabled: false });
    } finally {
      setPending(false);
    }
  };

  return (
    <SettingsForm.Viewport>
      {/* Device registration (this browser/device). */}
      <SettingsForm.Section title={t('settings.title')}>
        <SettingsForm.Item
          title={settings.enabled ? t('enabled.label') : t('enable.label')}
          description={denied ? t('permission-denied.label') : !supported ? t('unsupported.label') : undefined}
        >
          {settings.enabled ? (
            <Button disabled={pending} onClick={onDisable}>
              {t('disable.label')}
            </Button>
          ) : (
            <Button disabled={pending || denied || !supported} onClick={onEnable}>
              {t('enable.label')}
            </Button>
          )}
        </SettingsForm.Item>
      </SettingsForm.Section>

      {/* Toggleable rule presets contributed by other plugins. */}
      <SettingsForm.Section title={t('rules.title')}>
        {presets.map((preset) => {
          const existing = findRuleForPreset(rules, preset.id);
          const onToggle = () => {
            if (!rulesSpace) {
              return;
            }
            if (existing) {
              removeRule(rulesSpace, existing);
            } else {
              enablePreset(rulesSpace, preset);
            }
            reindexNotifications(client);
          };
          return (
            <SettingsForm.Item
              key={preset.id}
              title={t(preset.titleKey, { ns: preset.ns })}
              description={preset.descriptionKey ? t(preset.descriptionKey, { ns: preset.ns }) : undefined}
            >
              <Button disabled={!rulesSpace} onClick={onToggle}>
                {existing ? t('preset.disable.label') : t('preset.enable.label')}
              </Button>
            </SettingsForm.Item>
          );
        })}
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
