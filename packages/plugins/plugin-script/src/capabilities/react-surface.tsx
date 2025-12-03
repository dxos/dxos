//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { SettingsStore } from '@dxos/local-storage';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type AccessToken } from '@dxos/types';

import {
  DEPLOYMENT_DIALOG,
  DeploymentDialog,
  NotebookContainer,
  ScriptContainer,
  ScriptObjectSettings,
  ScriptPluginSettings,
  ScriptProperties,
  TestContainer,
} from '../components';
import { useCompiler } from '../hooks';
import { meta } from '../meta';
import { Notebook, type ScriptSettings } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<ScriptSettings> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <ScriptPluginSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/script/article`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
      component: ({ data, role }) => {
        const compiler = useCompiler();
        // TODO(dmaretskyi): Since settings store is not reactive, this would break on the script plugin being enabled without a page reload.
        const settings = useCapability(Capabilities.SettingsStore).getStore<ScriptSettings>(meta.id)?.value;
        return <ScriptContainer role={role} script={data.subject} settings={settings} env={compiler?.environment} />;
      },
    }),
    createSurface({
      id: `${meta.id}/notebook/article`,
      role: 'article',
      filter: (data): data is { subject: Notebook.Notebook } => Obj.instanceOf(Notebook.Notebook, data.subject),
      component: ({ data, role }) => {
        const compiler = useCompiler();
        return <NotebookContainer role={role} notebook={data.subject} env={compiler?.environment} />;
      },
    }),
    // TODO(burdon): Standardize PluginSettings vs ObjectSettings.
    // TODO(burdon): Why is ScriptProperties different from ScriptObjectSettings?
    createSurface({
      id: `${meta.id}/companion/base-settings`,
      role: 'base-object-settings',
      filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
      component: ({ data }) => <ScriptProperties object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion/settings`,
      role: 'object-settings',
      filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
      component: ({ data }) => <ScriptObjectSettings object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion/execute`,
      role: 'article',
      filter: (data): data is { companionTo: Script.Script } =>
        Obj.instanceOf(Script.Script, data.companionTo) && data.subject === 'execute',
      component: ({ data, role }) => <TestContainer script={data.companionTo} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/companion/logs`,
      role: 'article',
      filter: (data): data is { companionTo: Script.Script } =>
        Obj.instanceOf(Script.Script, data.companionTo) && data.subject === 'logs',
      component: ({ data }) => {
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
      filter: (data): data is { props: { accessToken: AccessToken.AccessToken; scriptTemplates: any } } =>
        data.component === DEPLOYMENT_DIALOG,
      component: ({ data }) => <DeploymentDialog {...data.props} />,
    }),
  ]);
