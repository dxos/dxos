//
// Copyright 2023 DXOS.org
//

import React, { useMemo, type PropsWithChildren } from 'react';

import { type Plugin, useIntentDispatcher, usePlugins } from '@dxos/app-framework';
import { ObservabilityAction } from '@dxos/plugin-observability/meta';
import { SettingsValue } from '@dxos/plugin-settings';
import { Input, useTranslation } from '@dxos/react-ui';

import { PluginList } from './PluginList';
import { type RegistrySettingsProps } from '../RegistryPlugin';
import { REGISTRY_PLUGIN } from '../meta';

export const PluginSettings = ({ settings }: { settings: RegistrySettingsProps }) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { enabled, core, plugins, setPlugin, ...pluginContext } = usePlugins();
  const dispatch = useIntentDispatcher();

  const sort = (a: Plugin['meta'], b: Plugin['meta']) => a.name?.localeCompare(b.name ?? '') ?? 0;

  // Memoize to prevent plugins from disappearing when toggling enabled.
  const installed = useMemo(
    () =>
      plugins
        .filter(({ meta }) => !core.includes(meta.id))
        .filter(({ meta }) => enabled.includes(meta.id))
        .map(({ meta }) => meta)
        .sort(sort),
    [],
  );

  const available = useMemo(() => pluginContext.available.filter(({ id }) => !enabled.includes(id)).sort(sort), []);
  const recommended = available.filter((meta) => !meta.tags?.includes('experimental'));
  const experimental = available.filter((meta) => meta.tags?.includes('experimental'));

  const handleChange = (id: string, enabled: boolean) => {
    setPlugin(id, enabled);
    void dispatch({
      action: ObservabilityAction.SEND_EVENT,
      data: {
        name: 'plugins.toggle',
        properties: { plugin: id, enabled },
      },
    });
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <>
      <SettingsValue label={t('settings show experimental label')}>
        <Input.Switch
          data-testid='pluginSettings.experimental'
          checked={settings.experimental}
          onCheckedChange={(checked) => (settings.experimental = !!checked)}
        />
      </SettingsValue>

      <Section label={t('settings section installed label')}>
        <PluginList
          plugins={installed}
          loaded={plugins.map(({ meta }) => meta.id)}
          enabled={enabled}
          onChange={handleChange}
          onReload={handleReload}
        />
      </Section>

      <Section label={t('settings section recommended label')}>
        <PluginList
          plugins={recommended}
          loaded={plugins.map(({ meta }) => meta.id)}
          enabled={enabled}
          onChange={handleChange}
          onReload={handleReload}
        />
      </Section>

      {settings.experimental && (
        <Section label={t('settings section experimental label')}>
          <PluginList
            plugins={experimental}
            loaded={plugins.map(({ meta }) => meta.id)}
            enabled={enabled}
            onChange={handleChange}
            onReload={handleReload}
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
