//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Capabilities, contributes, createSurface, useCapability, useLayout } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions/types';
import { SettingsStore } from '@dxos/local-storage';
import { Clipboard } from '@dxos/react-ui';

import { ScriptCapabilities } from './capabilities';
import { type Compiler } from '../compiler';
import { DebugPanel, ScriptSettings, ScriptContainer, ScriptSettingsPanel } from '../components';
import { useDeployState, useToolbarState } from '../hooks';
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
      filter: (data): data is { subject: ScriptType; variant: 'logs' | undefined } =>
        isInstanceOf(ScriptType, data.subject),
      component: ({ data, role }) => {
        const layout = useLayout();
        const [compiler, setCompiler] = useState<Compiler>();
        const getCompiler = useCapability(ScriptCapabilities.Compiler);
        const settings = useCapability(Capabilities.SettingsStore).getStore<ScriptSettingsProps>(SCRIPT_PLUGIN)?.value;
        useEffect(() => {
          void getCompiler(layout.workspace).then(setCompiler);
        }, [layout.workspace]);
        return (
          <ScriptContainer
            role={role}
            script={data.subject}
            variant={data.variant}
            settings={settings}
            compiler={compiler}
          />
        );
      },
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/automation`,
      role: 'complementary--function',
      position: 'hoist',
      filter: (data): data is { subject: ScriptType } => isInstanceOf(ScriptType, data.subject),
      component: ({ data }) => {
        // TODO(wittjosiah): Decouple hooks from toolbar state.
        const state = useToolbarState();
        useDeployState({ state, script: data.subject });
        return <DebugPanel functionUrl={state.functionUrl} />;
      },
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/settings-panel`,
      role: 'complementary--settings',
      filter: (data): data is { subject: ScriptType } => isInstanceOf(ScriptType, data.subject),
      component: ({ data }) => (
        <Clipboard.Provider>
          <ScriptSettingsPanel script={data.subject} />
        </Clipboard.Provider>
      ),
    }),
  ]);
