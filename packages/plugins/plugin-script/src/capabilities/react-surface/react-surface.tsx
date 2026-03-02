//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { getSpace } from '@dxos/react-client/echo';
import { Container } from '@dxos/react-ui';
import { type AccessToken } from '@dxos/types';

import { DEPLOYMENT_DIALOG } from '../../constants';
import {
  DeploymentDialog,
  NotebookContainer,
  ScriptContainer,
  ScriptObjectSettings,
  ScriptPluginSettings,
  ScriptProperties,
  TestContainer,
} from '../../containers';
import { useCompiler } from '../../hooks';
import { meta } from '../../meta';
import { Notebook, ScriptCapabilities, type ScriptSettings } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<ScriptSettings>(subject.atom);
          return <ScriptPluginSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/script/article`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
        component: ({ data, role }) => {
          const compiler = useCompiler();
          const settings = useAtomCapability(ScriptCapabilities.Settings);
          // TODO(wittjosiah): Why? The editor should be allow to render even if the environment is not ready.
          if (!compiler?.environment) {
            return null;
          }

          return <ScriptContainer role={role} subject={data.subject} settings={settings} env={compiler?.environment} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/notebook/article`,
        role: 'article',
        filter: (data): data is { subject: Notebook.Notebook } => Obj.instanceOf(Notebook.Notebook, data.subject),
        component: ({ data, role }) => {
          const compiler = useCompiler();
          return <NotebookContainer role={role} subject={data.subject} env={compiler?.environment} />;
        },
      }),
      // TODO(burdon): Standardize PluginSettings vs ObjectSettings.
      // TODO(burdon): Why is ScriptProperties different from ScriptObjectSettings?
      Surface.create({
        id: `${meta.id}/companion/base-settings`,
        role: 'base-object-settings',
        filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
        component: ({ data }) => <ScriptProperties object={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}/companion/settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Script.Script } => Obj.instanceOf(Script.Script, data.subject),
        component: ({ data }) => <ScriptObjectSettings object={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}/companion/execute`,
        role: 'article',
        filter: (data): data is { companionTo: Script.Script } =>
          Obj.instanceOf(Script.Script, data.companionTo) && data.subject === 'execute',
        component: ({ data, role }) => <TestContainer script={data.companionTo} role={role} />,
      }),
      Surface.create({
        id: `${meta.id}/companion/logs`,
        role: 'article',
        filter: (data): data is { companionTo: Script.Script } =>
          Obj.instanceOf(Script.Script, data.companionTo) && data.subject === 'logs',
        component: ({ data, role }) => {
          const space = getSpace(data.companionTo);
          const queueDxn = space?.properties.invocationTraceQueue?.dxn;
          return (
            <Container.Main role={role}>
              <InvocationTraceContainer
                db={space?.db}
                queueDxn={queueDxn}
                target={data.companionTo}
                detailAxis='block'
              />
            </Container.Main>
          );
        },
      }),
      Surface.create({
        id: DEPLOYMENT_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: { accessToken: AccessToken.AccessToken; scriptTemplates: any } } =>
          data.component === DEPLOYMENT_DIALOG,
        component: ({ data }) => <DeploymentDialog {...data.props} />,
      }),
    ]),
  ),
);
