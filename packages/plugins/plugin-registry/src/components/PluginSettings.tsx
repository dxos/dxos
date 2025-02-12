//
// Copyright 2023 DXOS.org
//

import React, { useMemo, type PropsWithChildren } from 'react';

import { createIntent, type Plugin, useIntentDispatcher, usePluginManager } from '@dxos/app-framework';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-form';

import { PluginList } from './PluginList';
import { REGISTRY_PLUGIN } from '../meta';
import { type RegistrySettings } from '../types';

const sortByPluginMeta = ({ meta: { name: a = '' } }: Plugin, { meta: { name: b = '' } }: Plugin) => a.localeCompare(b);

export const PluginSettings = ({ settings }: { settings: RegistrySettings }) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const manager = usePluginManager();
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  // Memoize to prevent plugins from disappearing when toggling enabled.
  const installed = useMemo(
    () =>
      manager.plugins
        .filter(({ meta }) => !manager.core.includes(meta.id))
        .filter(({ meta }) => manager.enabled.includes(meta.id))
        .sort(sortByPluginMeta),
    [],
  );
  const pluginIds = useMemo(() => installed.map(({ meta }) => meta.id), [installed]);

  const available = useMemo(
    () => manager.plugins.filter(({ meta }) => !manager.enabled.includes(meta.id)).sort(sortByPluginMeta),
    [],
  );
  const recommended = available.filter(({ meta }) => !meta.tags?.includes('experimental'));
  const experimental = available.filter(({ meta }) => meta.tags?.includes('experimental'));

  const handleChange = async (id: string, enabled: boolean) => {
    if (enabled) {
      await manager.enable(id);
    } else {
      await manager.disable(id);
    }

    await dispatch(
      createIntent(ObservabilityAction.SendEvent, {
        name: 'plugins.toggle',
        properties: { plugin: id, enabled },
      }),
    );
  };

  return (
    <>
      <DeprecatedFormInput label={t('settings show experimental label')}>
        <Input.Switch
          data-testid='pluginSettings.experimental'
          checked={settings.experimental}
          onCheckedChange={(checked) => (settings.experimental = !!checked)}
        />
      </DeprecatedFormInput>

      <Section label={t('settings section installed label')}>
        <PluginList plugins={installed} installed={pluginIds} enabled={manager.enabled} onChange={handleChange} />
      </Section>

      <Section label={t('settings section recommended label')}>
        <PluginList plugins={recommended} installed={pluginIds} enabled={manager.enabled} onChange={handleChange} />
      </Section>

      {settings.experimental && (
        <Section label={t('settings section experimental label')}>
          <PluginList plugins={experimental} installed={pluginIds} enabled={manager.enabled} onChange={handleChange} />
        </Section>
      )}
    </>
  );
};

const Section = ({ label, children }: PropsWithChildren<{ label: string }>) => {
  return (
    <div>
      <h2 className='py-2 text-sm text-subdued'>{label}</h2>
      {children}
    </div>
  );
};
