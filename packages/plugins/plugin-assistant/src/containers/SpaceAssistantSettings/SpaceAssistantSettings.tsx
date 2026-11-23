//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Space } from '@dxos/client/echo';
import * as Hook from '@dxos/compute/Hook';
import { Annotation } from '@dxos/echo';
import { Form } from '@dxos/react-ui-form';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { AssistantNamespace } from '../../namespace.ts';

type PluginRow = {
  plugin: string;
  name: string;
  enabled: boolean;
  /** Every hook is gated by a skill, so it runs only where one is bound. */
  scoped: boolean;
  /** The space turns the plugin on but this device does not have it. */
  missing: boolean;
};

/**
 * The space's assistant settings: which plugins' hooks run for every agent in the space, one toggle per
 * plugin. A plugin with no setting shows its default (see `Hook.isOnByDefault`).
 *
 * The page is reached from space settings, so the space comes from context rather than surface data.
 */
export const SpaceAssistantSettings = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return <HooksSettings space={space} />;
};

const HooksSettings = ({ space }: { space: Space }) => {
  const { t } = UiHooks.useTranslation(AssistantNamespace.key);
  const catalog = Hooks.useCapabilities(AppCapabilities.HookDefinition);
  const manager = PluginManagerProvider.usePluginManager();
  const settings: Hook.Settings = useAtomValue(Annotation.atom(space.properties, Hook.SettingsAnnotation)).pipe(
    Option.getOrElse(() => ({})),
  );

  const rows = useMemo<PluginRow[]>(() => {
    const nameOf = (plugin: string) =>
      manager.getPlugins().find((candidate) => candidate.meta.profile.key === plugin)?.meta.profile.name ?? plugin;
    const present = [...new Set(catalog.map((hook) => hook.plugin))].map((plugin) => ({
      plugin,
      name: nameOf(plugin),
      enabled: settings[plugin] ?? Hook.isOnByDefault(catalog, plugin),
      scoped: Hook.isOnByDefault(catalog, plugin),
      missing: false,
    }));
    const missing = Object.keys(settings)
      .filter((plugin) => settings[plugin] && !catalog.some((hook) => hook.plugin === plugin))
      .map((plugin) => ({ plugin, name: nameOf(plugin), enabled: true, scoped: false, missing: true }));
    return [...present, ...missing].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, manager, settings]);

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('space-settings-hooks.label')} description={t('space-settings-hooks.description')}>
            {rows.length === 0 && <p className='text-description'>{t('space-settings-hooks.empty.message')}</p>}
            {rows.map(({ plugin, name, enabled, scoped, missing }) => (
              <Form.Field
                key={plugin}
                label={name}
                description={t(
                  missing
                    ? 'space-settings-hooks.missing.description'
                    : scoped
                      ? 'space-settings-hooks.scoped.description'
                      : 'space-settings-hooks.every-agent.description',
                )}
              >
                <Input.Switch
                  checked={enabled}
                  onCheckedChange={({ checked }) => Hook.setEnabled(space.properties, plugin, checked)}
                />
              </Form.Field>
            ))}
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SpaceAssistantSettings.displayName = 'SpaceAssistantSettings';
