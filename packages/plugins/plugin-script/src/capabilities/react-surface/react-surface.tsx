//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
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
} from '../../components';
import { useCompiler } from '../../hooks';
import { meta } from '../../meta';
import { Notebook, type ScriptSettings } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: SettingsStore<ScriptSettings> } =>
          data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => <ScriptPluginSettings settings={subject.value} />,
      }),
      Common.createSurface({
        id: `${meta.id}/script/article`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
        component: ({ data, role }) => {
          const compiler = useCompiler();
          // TODO(dmaretskyi): Since settings store is not reactive, this would break on the script plugin being enabled without a page reload.
          const settings = useCapability(Common.Capability.SettingsStore).getStore<ScriptSettings>(meta.id)?.value;
          // TODO(wittjosiah): Why? The editor should be allow to render even if the environment is not ready.
          if (!compiler?.environment) {
            return null;
          }

          return <ScriptContainer role={role} script={data.subject} settings={settings} env={compiler?.environment} />;
        },
      }),
      Common.createSurface({
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
      Common.createSurface({
        id: `${meta.id}/companion/base-settings`,
        role: 'base-object-settings',
        filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
        component: ({ data }) => <ScriptProperties object={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/companion/settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
        component: ({ data }) => <ScriptObjectSettings object={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/companion/execute`,
        role: 'article',
        filter: (data): data is { companionTo: Script.Script } =>
          Obj.instanceOf(Script.Script, data.companionTo) && data.subject === 'execute',
        component: ({ data, role }) => <TestContainer script={data.companionTo} role={role} />,
      }),
      Common.createSurface({
        id: `${meta.id}/companion/logs`,
        role: 'article',
        filter: (data): data is { companionTo: Script.Script } =>
          Obj.instanceOf(Script.Script, data.companionTo) && data.subject === 'logs',
        component: ({ data }) => {
          const space = getSpace(data.companionTo);
          const queueDxn = space?.properties.invocationTraceQueue?.dxn;
          return (
            <StackItem.Content>
              <InvocationTraceContainer
                db={space?.db}
                queueDxn={queueDxn}
                target={data.companionTo}
                detailAxis='block'
              />
            </StackItem.Content>
          );
        },
      }),
      Common.createSurface({
        id: DEPLOYMENT_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: { accessToken: AccessToken.AccessToken; scriptTemplates: any } } =>
          data.component === DEPLOYMENT_DIALOG,
        component: ({ data }) => <DeploymentDialog {...data.props} />,
      }),
    ]),
  ),
);
