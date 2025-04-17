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
import { StackItem } from '@dxos/react-ui-stack';

import { ScriptCapabilities } from './capabilities';
import { ScriptSettings, ScriptContainer, ScriptSettingsPanel, TestPanel } from '../components';
import { useDeployState, useToolbarState } from '../hooks';
import { meta } from '../meta';
import { type ScriptSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<ScriptSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <ScriptSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/article`,
      role: 'article',
      filter: (data): data is { subject: ScriptType } => isInstanceOf(ScriptType, data.subject) && !data.variant,
      component: ({ data, role }) => {
        const compiler = useCapability(ScriptCapabilities.Compiler);
        // TODO(dmaretskyi): Since settings store is not reactive, this would break on the script plugin being enabled without a page reload.
        const settings = useCapability(Capabilities.SettingsStore).getStore<ScriptSettingsProps>(meta.id)?.value;
        return <ScriptContainer role={role} script={data.subject} settings={settings} env={compiler.environment} />;
      },
    }),
    createSurface({
      id: `${meta.id}/companion/settings`,
      role: 'article',
      filter: (data): data is { subject: ScriptType } =>
        isInstanceOf(ScriptType, data.subject) && data.variant === 'settings',
      component: ({ data, role }) => {
        return (
          <StackItem.Content role={role}>
            <ScriptSettingsPanel script={data.subject} />
          </StackItem.Content>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/companion/execute`,
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
      id: `${meta.id}/companion/logs`,
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
  ]);
