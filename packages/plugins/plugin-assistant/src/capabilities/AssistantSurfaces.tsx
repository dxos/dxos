//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks or compose.

import React, { useEffect } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { getSpace } from '@dxos/client/echo';
import * as Instructions from '@dxos/compute/Instructions';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed, Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { AssistantSettings, SpaceHomeSuggestions, TracePanel, TriggerStatus } from '#containers';
import { Assistant } from '#types';

export type AssistantSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

export const AssistantSettingsSurface = ({ subject }: AssistantSettingsSurfaceProps) => {
  const { settings, updateSettings } = Hooks.useSettingsState<Assistant.Settings>(subject.atom);

  return (
    <AssistantSettings
      settings={settings}
      onSettingsChange={updateSettings}
      scope={<SettingsScope.Root prefix={subject.prefix} />}
    />
  );
};

export type SpaceHomeSuggestionsSurfaceProps = {
  space: Space;
};

/** Suggestions are dismissible per space, so visibility is durable UI state rather than surface data. */
export const SpaceHomeSuggestionsSurface = ({ space }: SpaceHomeSuggestionsSurfaceProps) => {
  const { visible, hide } = ToolkitHooks.useHomeVisibility(space, 'spaceHomeSuggestions');

  return visible ? <SpaceHomeSuggestions space={space} onClose={hide} /> : null;
};

export type InvocationsSurfaceProps = {
  role: string;
  companionTo: Obj.Unknown;
};

/** Resolves the space's invocation-trace feed for the companion's subject. */
export const InvocationsSurface = ({ role, companionTo }: InvocationsSurfaceProps) => {
  const space = getSpace(companionTo);
  const feed = useResolveRef(space?.properties.invocationTraceFeed);
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;
  // TODO(wittjosiah): Support invocation filtering for prompts.
  const target = Obj.instanceOf(Instructions.Instructions, companionTo) ? undefined : companionTo;

  return (
    <Panel.Root role={role} width='document'>
      <Panel.Body asChild>
        <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} target={target} detailAxis='block' />
      </Panel.Body>
    </Panel.Root>
  );
};

export const TracePanelSurface = () => {
  const space = ToolkitHooks.useActiveSpace();
  useEffect(() => {
    log('trace panel surface', { hasSpace: Boolean(space), spaceId: space?.id });
  }, [space?.id]);

  if (!space) {
    return null;
  }

  return <TracePanel space={space} />;
};

export const TriggerStatusSurface = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return <TriggerStatus role='status-indicator' space={space} />;
};
