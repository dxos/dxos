//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type Plugin, SettingsValue, usePlugins } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';
import { isNotNullOrUndefined } from '@dxos/util';

import { PluginList } from './PluginList';
import { type RegistrySettingsProps } from '../RegistryPlugin';
import { REGISTRY_PLUGIN } from '../meta';

export const PluginSettings = ({ settings }: { settings: RegistrySettingsProps }) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { available, plugins, enabled, setPlugin } = usePlugins();

  const sort = (a: Plugin['meta'], b: Plugin['meta']) => a.name?.localeCompare(b.name ?? '') ?? 0;

  const installed = enabled
    .map<Plugin['meta'] | undefined>((id) => plugins.find((plugin) => plugin.meta.id === id)?.meta)
    .filter(isNotNullOrUndefined)
    .sort(sort);

  const recommended = available
    .filter((meta) => !installed.includes(meta) && !meta.tags?.includes('experimental'))
    .sort(sort);

  const experimental = available
    .filter((meta) => !installed.includes(meta) && meta.tags?.includes('experimental'))
    .sort(sort);

  return (
    <>
      <SettingsValue label={t('settings show experimental label')}>
        <Input.Switch
          checked={settings.experimental}
          onCheckedChange={(checked) => (settings.experimental = !!checked)}
        />
      </SettingsValue>

      <Section label={t('settings section installed label')}>
        <PluginList
          plugins={installed}
          loaded={plugins.map(({ meta }) => meta.id)}
          enabled={enabled}
          onChange={(id, enabled) => setPlugin(id, enabled)}
        />
      </Section>

      <Section label={t('settings section recommended label')}>
        <PluginList
          plugins={recommended}
          loaded={plugins.map(({ meta }) => meta.id)}
          enabled={enabled}
          onChange={(id, enabled) => setPlugin(id, enabled)}
        />
      </Section>

      {settings.experimental && (
        <Section label={t('settings section experimental label')}>
          <PluginList
            plugins={experimental}
            loaded={plugins.map(({ meta }) => meta.id)}
            enabled={enabled}
            onChange={(id, enabled) => setPlugin(id, enabled)}
          />
        </Section>
      )}
    </>
  );
};

const Section = ({ label, children }: PropsWithChildren<{ label: string }>) => {
  return (
    <div>
      <h2 className='py-2 text-sm text-neutral-500'>{label}</h2>
      {children}
    </div>
  );
};
