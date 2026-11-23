//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { meta } from '#meta';
import { NativeCapabilities, Settings } from '#types';

import { type NativeOptions, isAutoUpdateOn } from '../../settings-store.ts';

export type NativeSettingsProps = NativeOptions & {
  subject: AppCapabilities.Settings;
};

export const NativeSettings = ({ subject, defaultAutoUpdate }: NativeSettingsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { settings, updateSettings } = Hooks.useSettingsState<Settings.Settings>(subject.atom);
  const manager = Hooks.useCapability(NativeCapabilities.UpdateManager);
  const { description, button } = ToolkitHooks.useUpdateRow({ manager, t });

  return (
    <Form.Root schema={Settings.Settings} values={settings} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet
            label={meta.profile.name ?? meta.profile.key}
            actions={<SettingsScope.Root prefix={subject.prefix} />}
          >
            <Form.Field label={t('settings.auto-update.label')} description={t('settings.auto-update.description')}>
              <Input.Switch
                checked={isAutoUpdateOn(settings, { defaultAutoUpdate })}
                onCheckedChange={({ checked }) => updateSettings((current) => ({ ...current, autoUpdate: !!checked }))}
              />
            </Form.Field>
            <Form.Field standalone label={t('settings.updates.label')} description={description}>
              {button}
            </Form.Field>
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

NativeSettings.displayName = 'NativeSettings';
