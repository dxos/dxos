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
  /** Plugin NSID (`org.dxos.plugin.thread`). */
  key: string;
  name: string;
  description?: string;
  /** The semver range the space accepts, or `undefined` when the space does not name it. */
  range?: string;
  /** The range to write when the plugin is turned on, derived from the version this client has. */
  defaultRange: string;
};

export type SpacePluginsPanelProps = {
  plugins: readonly SpacePluginRow[];
  /** Whether the space names a set of its own, rather than deferring to each member's. */
  scoped: boolean;
  /** Name the plugin at `range`, or stop naming it when `range` is `undefined`. */
  onChange: (key: string, range: string | undefined) => void;
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
            {plugins.map(({ key, name, description, range, defaultRange }) => (
              <Form.Field
                key={key}
                label={name}
                // The range is the space's contract with the plugin, so it reads beside the plugin it binds.
                description={range ? `${description ? `${description} ` : ''}(${range})` : description}
              >
                <Input.Switch
                  checked={range !== undefined}
                  onCheckedChange={({ checked }) => onChange(key, checked ? defaultRange : undefined)}
                  data-testid={`spacePlugins.toggle.${key}`}
                />
              </Form.Field>
            ))}

            {/* In the group it acts on, as the space's other reset sits inside its own group. */}
            <Form.Field
              standalone
              label={t('reset-space-plugins.label')}
              description={t('reset-space-plugins.description')}
            >
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
