//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { SettingsStore } from '@dxos/local-storage';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import {
  DEPLOYMENT_DIALOG,
  DeploymentDialog,
  ScriptContainer,
  ScriptObjectSettings,
  ScriptPluginSettings,
  ScriptProperties,
  TestContainer,
} from '../components';
import { meta } from '../meta';
import { type ScriptSettingsProps } from '../types';

import { ScriptCapabilities } from './capabilities';

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
      id: `${meta.id}/companion/base-settings`,
      role: 'base-object-settings', // TODO(burdon): Standardize PluginSettings vs ObjectSettings.
      filter: (data): data is { subject: ScriptType } => Obj.instanceOf(ScriptType, data.subject),
      component: ({ data }) => <ScriptProperties object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/article`,
      role: ['article', 'section'],
      filter: (data): data is { subject: ScriptType } => Obj.instanceOf(ScriptType, data.subject),
      component: ({ data, role }) => {
        const compiler = useCapability(ScriptCapabilities.Compiler);
        // TODO(dmaretskyi): Since settings store is not reactive, this would break on the script plugin being enabled without a page reload.
        const settings = useCapability(Capabilities.SettingsStore).getStore<ScriptSettingsProps>(meta.id)?.value;
        return <ScriptContainer role={role} script={data.subject} settings={settings} env={compiler.environment} />;
      },
    }),
    createSurface({
      id: `${meta.id}/companion/settings`,
      role: 'object-settings',
      filter: (data): data is { subject: ScriptType } => Obj.instanceOf(ScriptType, data.subject),
      component: ({ data }) => <ScriptObjectSettings object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion/execute`,
      role: 'article',
      filter: (data): data is { companionTo: ScriptType } =>
        Obj.instanceOf(ScriptType, data.companionTo) && data.subject === 'execute',
      component: ({ data, role }) => <TestContainer script={data.companionTo} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/companion/logs`,
      role: 'article',
      filter: (data): data is { companionTo: ScriptType } =>
        Obj.instanceOf(ScriptType, data.companionTo) && data.subject === 'logs',
      component: ({ data, role }) => {
        const space = getSpace(data.companionTo);
        return (
          <StackItem.Content>
            <InvocationTraceContainer space={space} target={data.companionTo} detailAxis='block' />
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
