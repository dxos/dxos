//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { InvocationTraceContainer } from '@dxos/devtools';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { SettingsStore } from '@dxos/local-storage';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { ScriptCapabilities } from './capabilities';
import {
  ScriptContainer,
  ScriptPluginSettings,
  ScriptObjectSettings,
  TestPanel,
  ScriptProperties,
  DeploymentDialog,
  DEPLOYMENT_DIALOG,
} from '../components';
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
      component: ({ data: { subject } }) => <ScriptPluginSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/article`,
      role: 'article',
      filter: (data): data is { subject: ScriptType } => isInstanceOf(ScriptType, data.subject),
      component: ({ data, role }) => {
        const compiler = useCapability(ScriptCapabilities.Compiler);
        // TODO(dmaretskyi): Since settings store is not reactive, this would break on the script plugin being enabled without a page reload.
        const settings = useCapability(Capabilities.SettingsStore).getStore<ScriptSettingsProps>(meta.id)?.value;
        return <ScriptContainer role={role} script={data.subject} settings={settings} env={compiler.environment} />;
      },
    }),
    createSurface({
      id: `${meta.id}/companion/base-settings`,
      role: 'base-object-settings',
      filter: (data): data is { subject: ScriptType } => isInstanceOf(ScriptType, data.subject),
      component: ({ data }) => <ScriptProperties object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion/settings`,
      role: 'object-settings',
      filter: (data): data is { subject: ScriptType } => isInstanceOf(ScriptType, data.subject),
      component: ({ data }) => <ScriptObjectSettings object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion/execute`,
      role: 'article',
      filter: (data): data is { companionTo: ScriptType } =>
        isInstanceOf(ScriptType, data.companionTo) && data.subject === 'execute',
      component: ({ data, role }) => {
        // TODO(wittjosiah): Decouple hooks from toolbar state.
        const state = useToolbarState();
        useDeployState({ state, script: data.companionTo });
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
      filter: (data): data is { companionTo: ScriptType } =>
        isInstanceOf(ScriptType, data.companionTo) && data.subject === 'logs',
      component: ({ data, role }) => {
        const space = getSpace(data.companionTo);
        return (
          <StackItem.Content role={role}>
            <InvocationTraceContainer space={space} script={data.companionTo} detailAxis='block' />
          </StackItem.Content>
        );
      },
    }),
    createSurface({
      id: DEPLOYMENT_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { accessToken: DataType.AccessToken; scriptTemplates: any } } =>
        data.component === DEPLOYMENT_DIALOG,
      component: ({ data }) => <DeploymentDialog {...data.props} />,
    }),
  ]);
