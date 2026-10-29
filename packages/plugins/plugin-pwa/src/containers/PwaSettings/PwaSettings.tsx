//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import '@dxos/react-ui/theme.css';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppPush from '@dxos/app-toolkit/AppPush';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { Settings } from '#types';

export type PwaSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Push notifications ride a service worker too, so their toggle sits with the updates row. */
const NotificationsRows = ({ push, t }: { push: AppPush.Notifications; t: Translate }) => {
  const { notice, toggle, test } = ToolkitHooks.usePushNotificationsRow({ push, t });
  return (
    <>
      {notice && (
        <Banner.Root valence={notice.valence}>
          <Banner.Body>
            {notice.message}
            {notice.detail && <span className='block'>{notice.detail}</span>}
          </Banner.Body>
        </Banner.Root>
      )}
      <Form.Field
        standalone
        label={t('settings.notifications.label')}
        description={t('settings.notifications.description')}
      >
        {toggle}
      </Form.Field>
      {test && (
        <Form.Field standalone label={t('settings.notifications.test.title')} description={test.description}>
          {test.button}
        </Form.Field>
      )}
    </>
  );
};

/** The web counterpart of NativeSettings: same row, same capability, whichever platform contributed it. */
export const PwaSettings = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const manager = Hooks.useCapability(AppCapabilities.UpdateManager);
  const { description, button } = ToolkitHooks.useUpdateRow({ manager, t });
  // Optional: contributed by whichever plugin registers this device with the server that pushes.
  const [push] = Hooks.useCapabilities(AppCapabilities.PushNotifications);

  return (
    <Form.Root schema={Schema.Struct({})} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet
            label={meta.profile.name ?? meta.profile.key}
            actions={<SettingsScope.Root prefix={meta.profile.key} />}
          >
            <Form.Field standalone label={t('settings.updates.label')} description={description}>
              {button}
            </Form.Field>
            {push && <NotificationsRows push={push} t={t} />}
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

PwaSettings.displayName = 'PwaSettings';
