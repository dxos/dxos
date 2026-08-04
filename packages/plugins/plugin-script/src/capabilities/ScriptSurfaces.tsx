//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks.

import React from 'react';

import { useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { type Script } from '@dxos/compute';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { NotebookArticle, ScriptArticle, ScriptSettings } from '#containers';
import { useCompiler } from '#hooks';
import { type Notebook, ScriptCapabilities, type Settings } from '#types';

import { getAccessCredential } from '../util';

export type ScriptSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

export const ScriptSettingsSurface = ({ subject }: ScriptSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
  const client = useClient();
  // TODO(burdon): Check token.
  const handleAuthenticate = async () => {
    const { identityKey } = client.halo.identity.get()!;
    await client.halo.writeCredentials([getAccessCredential(identityKey)]);
  };

  return <ScriptSettings settings={settings} onSettingsChange={updateSettings} onAuthenticate={handleAuthenticate} />;
};

export type ScriptArticleSurfaceProps = {
  role: string;
  subject: Script.Script;
  attendableId?: string;
};

/** The compiler environment and settings are ambient, so they are resolved here rather than mapped. */
export const ScriptArticleSurface = ({ role, subject, attendableId }: ScriptArticleSurfaceProps) => {
  const compiler = useCompiler();
  const settings = useAtomCapability(ScriptCapabilities.Settings);

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
  const feed = space?.properties.invocationTraceFeed?.target;
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} target={script} detailAxis='block' />
      </Panel.Content>
    </Panel.Root>
  );
};
