//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';
import { Position } from '@dxos/util';

/**
 * Generic settings surface rendered for any plugin that contributes an
 * `AppCapabilities.Settings` entry. It drives a schema-based form from the
 * contributed `schema`/`atom`, so plugins whose settings are plain editable
 * fields need not register a bespoke settings surface.
 *
 * No section title is rendered: the settings plank heading already names the
 * plugin. Registered with `position: Position.last` so a plugin-specific surface
 * (matching by prefix) always wins under the settings article's `limit={1}`
 * dispatch.
 */
const DefaultSettings = ({ subject }: { subject: AppCapabilities.Settings }) => {
  const { settings, updateSettings } = useSettingsState<Record<string, any>>(subject.atom);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.FieldSet
        schema={subject.schema}
        values={settings}
        onValuesChanged={(values) => updateSettings(() => values)}
      />
    </SettingsForm.Viewport>
  );
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'defaultPluginSettings',
        position: Position.last,
        filter: AppSurface.settings(AppSurface.Article),
        component: ({ data: { subject } }) => <DefaultSettings subject={subject} />,
      }),
    ]),
  ),
);
