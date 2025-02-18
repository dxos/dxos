//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { ScriptType } from '@dxos/functions';
import { SettingsStore } from '@dxos/local-storage';
import { Clipboard } from '@dxos/react-ui';

import { ScriptCapabilities } from './capabilities';
import { AutomationPanel, ScriptSettings, ScriptContainer, ScriptSettingsPanel } from '../components';
import { SCRIPT_PLUGIN } from '../meta';
import { type ScriptSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${SCRIPT_PLUGIN}/settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<ScriptSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === SCRIPT_PLUGIN,
      component: ({ data: { subject } }) => <ScriptSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
      component: ({ data, role }) => {
        const compiler = useCapability(ScriptCapabilities.Compiler);
        const settings = useCapability(Capabilities.SettingsStore).getStore<ScriptSettingsProps>(SCRIPT_PLUGIN)!.value;
        return <ScriptContainer role={role} script={data.subject} settings={settings} env={compiler.environment} />;
      },
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/automation`,
      role: 'complementary--automation',
      position: 'hoist',
      filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
      component: ({ data }) => <AutomationPanel subject={data.subject} />,
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/settings-panel`,
      role: 'complementary--settings',
      filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
      component: ({ data }) => (
        <Clipboard.Provider>
          <ScriptSettingsPanel script={data.subject} />
        </Clipboard.Provider>
      ),
    }),
  ]);
