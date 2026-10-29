//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import '@dxos/react-ui/theme.css';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { meta } from '#meta';
import { Settings } from '#types';

import { type PwaOptions, isAutoUpdateOn } from '../../settings-store.ts';

export type PwaSettingsProps = PwaOptions & {
  subject: AppCapabilities.Settings;
};

/** The web counterpart of NativeSettings: same row, same capability, whichever platform contributed it. */
export const PwaSettings = ({ subject, defaultAutoUpdate }: PwaSettingsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { settings, updateSettings } = Hooks.useSettingsState<Settings.Settings>(subject.atom);
  const manager = Hooks.useCapability(AppCapabilities.UpdateManager);
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

PwaSettings.displayName = 'PwaSettings';
