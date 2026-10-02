//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import { useConfig } from '@dxos/react-client';
import { Form } from '@dxos/react-ui-form';
import * as Panel from '@dxos/react-ui/Panel';

import { FeedbackForm, type FeedbackPluginOption } from '#components';

import { DownloadLogsAction } from './DownloadLogsAction.tsx';
import { SupportSubmitAction, useSupportSubmit } from './SupportSubmitAction.tsx';

export const FeedbackPanel = () => {
  const config = useConfig();
  const manager = PluginManagerProvider.usePluginManager();
  const handleSubmit = useSupportSubmit();

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

  return (
    <Panel.Root>
      <Panel.Content>
        <FeedbackForm.Root hidden={hidden} plugins={plugins} onSubmit={handleSubmit}>
          <Form.Viewport>
            <Form.Content>
              <Form.Fields />
              <DownloadLogsAction />
              <SupportSubmitAction />
            </Form.Content>
          </Form.Viewport>
        </FeedbackForm.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

FeedbackPanel.displayName = 'FeedbackPanel';
