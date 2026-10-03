//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks.

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import type * as Script from '@dxos/compute/Script';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import * as ClientOperation from '@dxos/plugin-client/ClientOperation';
import { getSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { NotebookArticle, ScriptArticle, ScriptSettings } from '#containers';
import { useCompiler } from '#hooks';
import { Notebook, ScriptCapabilities, Settings } from '#types';

const HUB_SERVER_NAME = 'hub.dxos.network';

export type ScriptSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/** Hub authentication is a write, so it is dispatched as an operation rather than mapped as props. */
export const ScriptSettingsSurface = ({ subject }: ScriptSettingsSurfaceProps) => {
  const { settings, updateSettings } = Hooks.useSettingsState<Settings.Settings>(subject.atom);
  const { invokePromise } = Hooks.useOperationInvoker();
  // TODO(burdon): Check token.
  const handleAuthenticate = async () => {
    await invokePromise(ClientOperation.GrantServiceAccess, {
      serverName: HUB_SERVER_NAME,
      capabilities: ['composer:beta'],
    });
  };

  return (
    <ScriptSettings
      settings={settings}
      onSettingsChange={updateSettings}
      onAuthenticate={handleAuthenticate}
      scope={<SettingsScope.Root prefix={subject.prefix} />}
    />
  );
};

export type ScriptArticleSurfaceProps = {
  role: string;
  subject: Script.Script;
  attendableId?: string;
};

/** The compiler environment and settings are ambient, so they are resolved here rather than mapped. */
export const ScriptArticleSurface = ({ role, subject, attendableId }: ScriptArticleSurfaceProps) => {
  const compiler = useCompiler();
  const settings = Hooks.useAtomCapability(ScriptCapabilities.Settings);

  return (
    <ScriptArticle
      role={role}
      subject={subject}
      attendableId={attendableId}
      settings={settings}
      env={compiler?.environment}
    />
  );
};

export type NotebookArticleSurfaceProps = {
  role: string;
  subject: Notebook.Notebook;
  attendableId?: string;
};

export const NotebookArticleSurface = ({ role, subject, attendableId }: NotebookArticleSurfaceProps) => {
  const compiler = useCompiler();

  return <NotebookArticle role={role} subject={subject} attendableId={attendableId} env={compiler?.environment} />;
};

export type ScriptLogsSurfaceProps = {
  role: string;
  script: Script.Script;
};

/** Resolves the space's invocation-trace feed for the selected script. */
export const ScriptLogsSurface = ({ role, script }: ScriptLogsSurfaceProps) => {
  const space = getSpace(script);
  const feed = useResolveRef(space?.properties.invocationTraceFeed);
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;

  return (
    <Panel.Root role={role}>
      <Panel.Body asChild>
        <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} target={script} detailAxis='block' />
      </Panel.Body>
    </Panel.Root>
  );
};
