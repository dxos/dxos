//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { RegistryNamespace } from '../../namespace.ts';

/** One optional plugin, as the panel lists it. */
export type SpacePluginRow = {
  key: string;
  name: string;
  description?: string;
  /** Whether the space enables it. */
  enabled: boolean;
};

export type SpacePluginsPanelProps = {
  plugins: readonly SpacePluginRow[];
  /** Whether the space names a set of its own, rather than deferring to each member's. */
  scoped: boolean;
  onChange: (key: string, enabled: boolean) => void;
  onReset: () => void;
};

/**
 * Which plugins a space runs: one switch per optional plugin, plus the reset that hands the choice back
 * to its members.
 *
 * Presentational — the container reads the plugin list from the manager and the decisions from the
 * space's properties.
 */
export const SpacePluginsPanel = ({ plugins, scoped, onChange, onReset }: SpacePluginsPanelProps) => {
  const { t } = UiHooks.useTranslation(RegistryNamespace.key);

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet
            label={t('space-plugins.label')}
            description={t(scoped ? 'space-plugins.description' : 'space-plugins.unscoped.description')}
          >
            {plugins.length === 0 && <p className='text-description'>{t('space-plugins.empty.message')}</p>}
            {plugins.map(({ key, name, description, enabled }) => (
              <Form.Field key={key} label={name} description={description}>
                <Input.Switch
                  checked={enabled}
                  onCheckedChange={({ checked }) => onChange(key, checked)}
                  data-testid={`spacePlugins.toggle.${key}`}
                />
              </Form.Field>
            ))}
          </Form.FieldSet>

          <Form.FieldSet label={t('reset-space-plugins.label')} description={t('reset-space-plugins.description')}>
            <Form.Field standalone label={t('reset-space-plugins.label')}>
              <Button.Root disabled={!scoped} onClick={onReset} data-testid='spacePlugins.reset'>
                {t('reset-space-plugins.button.label')}
              </Button.Root>
            </Form.Field>
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SpacePluginsPanel.displayName = 'SpacePluginsPanel';
