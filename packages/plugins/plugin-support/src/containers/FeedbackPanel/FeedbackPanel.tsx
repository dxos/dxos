//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo, useState } from 'react';

import { useCapability, usePluginManager } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';
import { useConfig } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Panel } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { FeedbackForm, type FeedbackPluginOption } from '#components';

import { DownloadLogsAction } from './DownloadLogsAction';
import { SupportSubmitAction } from './SupportSubmitAction';

/** Renders the feedback form, disabling the submit when support tickets are unavailable. */
export const FeedbackPanel = () => {
  const observability = useCapability(ObservabilityCapabilities.Observability);
  const [supportAvailable, setSupportAvailable] = useState(false);
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

  useAsyncEffect(
    async (controller) => {
      const available = await observability.isAvailable('support').pipe(
        Effect.catch(() => Effect.succeed(false)),
        Effect.catchDefect(() => Effect.succeed(false)),
        EffectEx.runAndForwardErrors,
      );
      if (!controller.signal.aborted) {
        setSupportAvailable(available);
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
              <Form.FieldSet />
              <DownloadLogsAction />
              <SupportSubmitAction disabled={!supportAvailable} />
            </Form.Content>
          </Form.Viewport>
        </FeedbackForm.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

FeedbackPanel.displayName = 'FeedbackPanel';
