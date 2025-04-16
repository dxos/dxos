//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { InvocationTracePanel } from '@dxos/devtools';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions/types';
import { SettingsStore } from '@dxos/local-storage';
import { getSpace } from '@dxos/react-client/echo';
import { Clipboard } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { ScriptCapabilities } from './capabilities';
import { ScriptSettings, ScriptContainer, ScriptSettingsPanel, TestPanel } from '../components';
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
      filter: (data): data is { subject: ScriptType } => isInstanceOf(ScriptType, data.subject) && !data.variant,
      component: ({ data, role }) => {
        const compiler = useCapability(ScriptCapabilities.Compiler);
        // TODO(dmaretskyi): Since settings store is not reactive, this would break on the script plugin being enabled without a page reload.
        const settings = useCapability(Capabilities.SettingsStore).getStore<ScriptSettingsProps>(SCRIPT_PLUGIN)?.value;
        return <ScriptContainer role={role} script={data.subject} settings={settings} env={compiler.environment} />;
      },
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/article/execute`,
      role: 'article',
      filter: (data): data is { subject: ScriptType } =>
        isInstanceOf(ScriptType, data.subject) && data.variant === 'execute',
      component: ({ data, role }) => {
        // TODO(wittjosiah): Decouple hooks from toolbar state.
        const state = useToolbarState();
        useDeployState({ state, script: data.subject });
        return (
          <StackItem.Content role={role}>
            <TestPanel functionUrl={state.functionUrl} />
          </StackItem.Content>
        );
      },
    }),
    createSurface({
      id: `${SCRIPT_PLUGIN}/article/logs`,
      role: 'article',
      filter: (data): data is { subject: ScriptType } =>
        isInstanceOf(ScriptType, data.subject) && data.variant === 'logs',
      component: ({ data, role }) => {
        const space = getSpace(data.subject);
        return (
          <StackItem.Content role={role}>
            <InvocationTracePanel space={space} script={data.subject} detailAxis='block' />
          </StackItem.Content>
        );
      },
    }),
    // TODO(burdon): Move to companion.
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
