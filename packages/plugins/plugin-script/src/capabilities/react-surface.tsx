//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Script } from '@dxos/functions';
import { useClient } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { ScriptPluginSettings } from '#components';
import { DEPLOYMENT_DIALOG } from '../constants';
import {
  DeploymentDialog,
  NotebookContainer,
  ScriptContainer,
  ScriptObjectSettings,
  ScriptProperties,
  TestContainer,
} from '#containers';
import { useCompiler } from '#hooks';
import { meta } from '#meta';
import { Notebook, ScriptCapabilities, type Settings } from '#types';
import { getAccessCredential } from '../util';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          const client = useClient();
          // TODO(burdon): Check token.
          const handleAuthenticate = async () => {
            const { identityKey } = client.halo.identity.get()!;
            await client.halo.writeCredentials([getAccessCredential(identityKey)]);
          };
          return (
            <ScriptPluginSettings
              settings={settings}
              onSettingsChange={updateSettings}
              onAuthenticate={handleAuthenticate}
            />
          );
        },
      }),
      Surface.create({
id: 'script.article',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Script.Script),
        component: ({ data, role }) => {
          const compiler = useCompiler();
          const settings = useAtomCapability(ScriptCapabilities.Settings);
          // TODO(wittjosiah): Why? The editor should be allow to render even if the environment is not ready.
          if (!compiler?.environment) {
            return null;
          }

          return (
            <ScriptContainer
              role={role}
              subject={data.subject}
              attendableId={data.attendableId}
              settings={settings}
              env={compiler?.environment}
            />
          );
        },
      }),
      Surface.create({
        id: 'notebook.article',
        role: 'article',
        filter: AppSurface.objectArticle(Notebook.Notebook),
        component: ({ data, role }) => {
          const compiler = useCompiler();
          return (
            <NotebookContainer
              role={role}
              subject={data.subject}
              attendableId={data.attendableId}
              env={compiler?.environment}
            />
          );
        },
      }),
      // TODO(burdon): Standardize PluginSettings vs ObjectSettings.
      // TODO(burdon): Why is ScriptProperties different from ScriptObjectSettings?
      Surface.create({
        id: 'companion.base-settings',
        role: 'base-object-settings',
        filter: AppSurface.objectSection(Script.Script),
        component: ({ data }) => <ScriptProperties object={data.subject} />,
      }),
      Surface.create({
        id: 'companion.settings',
        role: 'object-settings',
        filter: AppSurface.objectSettings(Script.Script),
        component: ({ data }) => <ScriptObjectSettings object={data.subject} />,
      }),
      Surface.create({
        id: 'companion.execute',
        role: 'article',
        filter: AppSurface.and(AppSurface.literalArticle('execute'), AppSurface.companionArticle(Script.Script)),
        component: ({ data, role }) => <TestContainer script={data.companionTo} role={role} />,
      }),
      Surface.create({
        id: 'companion.logs',
        role: 'article',
        filter: AppSurface.and(AppSurface.literalArticle('logs'), AppSurface.companionArticle(Script.Script)),
        component: ({ data, role }) => {
          const space = getSpace(data.companionTo);
          const queueDxn = space?.properties.invocationTraceQueue?.dxn;
          return (
            <Panel.Root role={role}>
              <Panel.Content asChild>
                <InvocationTraceContainer
                  db={space?.db}
                  queueDxn={queueDxn}
                  target={data.companionTo}
                  detailAxis='block'
                />
              </Panel.Content>
            </Panel.Root>
          );
        },
      }),
      Surface.create({
        id: DEPLOYMENT_DIALOG,
        role: 'dialog',
        filter: AppSurface.componentDialog(DEPLOYMENT_DIALOG),
        component: ({ data }) => <DeploymentDialog {...data.props} />,
      }),
    ]),
  ),
);
