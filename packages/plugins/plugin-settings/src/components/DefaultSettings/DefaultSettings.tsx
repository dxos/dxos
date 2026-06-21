//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { usePluginManager, useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

export type DefaultSettingsProps = {
  subject: AppCapabilities.Settings;
};

/**
 * Generic settings surface rendered for any plugin that contributes an
 * `AppCapabilities.Settings` entry. It drives a schema-based form from the
 * contributed `schema`/`atom`, so plugins whose settings are plain editable
 * fields need not register a bespoke settings surface.
 *
 * The contributing plugin's name is rendered as the section heading (resolved
 * by matching `subject.prefix` against each plugin's `meta.profile.key`) so
 * every schema-driven settings article shows a consistent title.
 */
export const DefaultSettings = ({ subject }: DefaultSettingsProps) => {
  const manager = usePluginManager();
  const { settings, updateSettings } = useSettingsState<Record<string, any>>(subject.atom);
  const title = manager.getPlugins().find((plugin) => plugin.meta.profile.key === subject.prefix)?.meta.profile.name;

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={title ?? subject.prefix}>
        <SettingsForm.FieldSet
          schema={subject.schema}
          values={settings}
          onValuesChanged={(values) => updateSettings(() => values)}
        />
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
