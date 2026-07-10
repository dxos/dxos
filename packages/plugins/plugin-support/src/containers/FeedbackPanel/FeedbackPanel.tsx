//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo, useState } from 'react';

import { useAtomCapability, useCapability, usePluginManager } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { ObservabilityCapabilities } from '@dxos/plugin-observability';
import { useConfig } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Panel } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { FeedbackForm, type FeedbackPluginOption } from '#components';
import { SupportCapabilities } from '#types';

import { DiscordAction } from './DiscordAction';
import { DownloadLogsAction } from './DownloadLogsAction';
import { FeedbackSubmitAction } from './FeedbackSubmitAction';
import { GitHubAction } from './GitHubAction';

/** Renders the feedback form, disabling the PostHog/Discord submit paths when the survey is unavailable. */
export const FeedbackPanel = () => {
  const observability = useCapability(ObservabilityCapabilities.Observability);
  const settings = useAtomCapability(SupportCapabilities.Settings);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const config = useConfig();
  const manager = usePluginManager();

  const version = config.values.runtime?.app?.build?.version;

  // Plugin id + name list for the "Area" picker — derived from currently-loaded plugins.
  const plugins = useMemo<FeedbackPluginOption[]>(
    () =>
      manager
        .getPlugins()
        .map((plugin) => ({ id: plugin.meta.profile.key, name: plugin.meta.profile.name ?? plugin.meta.profile.key }))
        .sort(({ name: a }, { name: b }) => a.localeCompare(b)),
    [manager],
  );

  const hidden = useMemo(() => ({ version }), [version]);
  const excludeImage = useMemo(() => !settings?.enableGitHubIssues, [settings?.enableGitHubIssues]);

  useAsyncEffect(
    async (controller) => {
      const available = await observability.isAvailable('feedback').pipe(
        Effect.catchAll(() => Effect.succeed(false)),
        Effect.catchAllDefect(() => Effect.succeed(false)),
        EffectEx.runAndForwardErrors,
      );
      if (!controller.signal.aborted) {
        setFeedbackAvailable(available);
      }
    },
    [observability],
  );

  return (
    <Panel.Root>
      <Panel.Content>
        <FeedbackForm.Root hidden={hidden} plugins={plugins}>
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet filter={excludeImage ? (props) => props.filter((p) => p.name !== 'image') : undefined} />
              <DownloadLogsAction />
              {/* GH only opens a prefilled URL — independent of PostHog feedback availability. */}
              {/* PostHog + Discord both call `CaptureUserFeedback`, so they share the gate. */}
              <FeedbackSubmitAction disabled={!feedbackAvailable} />
              {settings?.enableGitHubIssues && <GitHubAction />}
              <DiscordAction disabled={!feedbackAvailable} />
            </Form.Content>
          </Form.Viewport>
        </FeedbackForm.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

FeedbackPanel.displayName = 'FeedbackPanel';
