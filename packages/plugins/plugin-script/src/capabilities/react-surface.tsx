//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Script } from '@dxos/compute';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { ScriptPluginSettings } from '#components';
import { DeploymentDialog, NotebookContainer, ScriptContainer, ScriptProperties, TestContainer } from '#containers';
import { useCompiler } from '#hooks';
import { meta } from '#meta';
import { Notebook, ScriptCapabilities, type Settings } from '#types';

import { DEPLOYMENT_DIALOG } from '../constants';
import { getAccessCredential } from '../util';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
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
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Script.Script),
          AppSurface.object(AppSurface.Section, Script.Script),
        ),
        component: ({ data, role }) => {
          const compiler = useCompiler();
          const settings = useAtomCapability(ScriptCapabilities.Settings);
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
        filter: AppSurface.object(AppSurface.Article, Notebook.Notebook),
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
      Surface.create({
        id: 'properties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Script.Script),
        component: ({ data, role }) => <ScriptProperties role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'companion.execute',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'execute'),
          AppSurface.companion(AppSurface.Article, Script.Script),
        ),
        component: ({ data, role }) => <TestContainer script={data.companionTo} role={role} />,
      }),
      Surface.create({
        id: 'companion.logs',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'logs'),
          AppSurface.companion(AppSurface.Article, Script.Script),
        ),
        component: ({ data, role }) => {
          const space = getSpace(data.companionTo);
          const feed = space?.properties.invocationTraceFeed?.target;
          const queueDxn = feed ? Feed.getQueueDxn(feed) : undefined;
          return (
            <Panel.Root role={role}>
              <Panel.Content>
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
        filter: AppSurface.component<ComponentProps<typeof DeploymentDialog>>(AppSurface.Dialog, DEPLOYMENT_DIALOG),
        component: ({ data }) => <DeploymentDialog {...data.props} />,
      }),
    ]),
  ),
);
