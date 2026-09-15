//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks or compose.

import React, { useEffect } from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { SettingsScope, useActiveSpace, useHomeVisibility } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/client/echo';
import * as Instructions from '@dxos/compute/Instructions';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { AssistantSettings, SpaceHomeSuggestions, TracePanel, TriggerStatus } from '#containers';
import { Assistant } from '#types';

export type AssistantSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

export const AssistantSettingsSurface = ({ subject }: AssistantSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Assistant.Settings>(subject.atom);

  return (
    <AssistantSettings
      settings={settings}
      onSettingsChange={updateSettings}
      scope={<SettingsScope prefix={subject.prefix} />}
    />
  );
};

export type SpaceHomeSuggestionsSurfaceProps = {
  space: Space;
};

/** Suggestions are dismissible per space, so visibility is durable UI state rather than surface data. */
export const SpaceHomeSuggestionsSurface = ({ space }: SpaceHomeSuggestionsSurfaceProps) => {
  const { visible, hide } = useHomeVisibility(space, 'spaceHomeSuggestions');

  return visible ? <SpaceHomeSuggestions space={space} onClose={hide} /> : null;
};

export type InvocationsSurfaceProps = {
  role: string;
  companionTo: Obj.Unknown;
};

/** Resolves the space's invocation-trace feed for the companion's subject. */
export const InvocationsSurface = ({ role, companionTo }: InvocationsSurfaceProps) => {
  const space = getSpace(companionTo);
  const feed = space?.properties.invocationTraceFeed?.target;
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;
  // TODO(wittjosiah): Support invocation filtering for prompts.
  const target = Obj.instanceOf(Instructions.Instructions, companionTo) ? undefined : companionTo;

  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Content asChild>
        <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} target={target} detailAxis='block' />
      </Panel.Content>
    </Panel.Root>
  );
};

export const TracePanelSurface = () => {
  const space = useActiveSpace();
  useEffect(() => {
    log('trace panel surface', { hasSpace: Boolean(space), spaceId: space?.id });
  }, [space?.id]);

  if (!space) {
    return null;
  }

  return <TracePanel space={space} />;
};

export const TriggerStatusSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <TriggerStatus role='status-indicator' space={space} />;
};
