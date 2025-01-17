//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { ScriptType } from '@dxos/functions';

import { ScriptCapabilities } from './capabilities';
import { AutomationPanel, ScriptSettings, ScriptContainer, ScriptSettingsPanel } from '../components';
import { SCRIPT_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${SCRIPT_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === SCRIPT_PLUGIN,
      component: () => <ScriptSettings settings={{}} />,
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
      component: ({ data, role }) => {
        const compiler = useCapability(ScriptCapabilities.Compiler);
        return <ScriptContainer role={role} script={data.subject} env={compiler.environment} />;
      },
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/automation`,
      role: 'complementary--automation',
      disposition: 'hoist',
      filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
      component: ({ data }) => <AutomationPanel subject={data.subject} />,
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/settings-panel`,
      role: 'complementary--settings',
      filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
      component: ({ data }) => <ScriptSettingsPanel script={data.subject} />,
    }),
  ]);
