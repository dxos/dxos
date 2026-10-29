//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppPush from '@dxos/app-toolkit/AppPush';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { NativeCapabilities, Settings } from '#types';

export type NativeSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

type Translate = (key: string, options?: Record<string, unknown>) => string;

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

/** Update and notification status come from capabilities, so this panel takes no settings props. */
export const NativeSettings = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const manager = Hooks.useCapability(NativeCapabilities.UpdateManager);
  const { description, button } = ToolkitHooks.useUpdateRow({ manager, t });
  // Optional: contributed by the plugin that delivers notifications (plugin-messenger).
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

NativeSettings.displayName = 'NativeSettings';
