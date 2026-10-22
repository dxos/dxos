//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { MessengerCapabilities, Settings } from '#types';

export type MessengerSettingsProps = AppSurface.SettingsData;

/** Shown until push registration activates, or where it never does (no client, not a browser). */
const unavailable = Atom.make<MessengerCapabilities.PushStatus>('unsupported');

/**
 * The toggle drives push registration instead of writing the setting: registration writes it back only once the
 * device is actually registered. The form keeps its own value after an edit, so it is remounted when an attempt
 * settles, which puts a refused or failed toggle back to off.
 */
export const MessengerSettings = ({ subject }: MessengerSettingsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { settings } = Hooks.useSettingsState<Settings.Settings>(subject.atom);
  const [push] = Hooks.useCapabilities(MessengerCapabilities.PushNotifications);
  const status = useAtomValue(push?.status ?? unavailable);
  const [attempts, setAttempts] = useState(0);

  return (
    <Form.Root
      key={attempts}
      schema={Settings.Settings}
      values={settings}
      variant='settings'
      onValuesChanged={(values) => {
        const notifications = { ...settings, ...values }.notifications;
        if (push && notifications !== settings.notifications) {
          void (notifications ? push.enable() : push.disable()).finally(() => setAttempts((count) => count + 1));
        }
      }}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet
            label={meta.profile.name ?? meta.profile.key}
            actions={<SettingsScope.Root prefix={meta.profile.key} />}
          >
            {status !== 'on' && status !== 'off' && (
              <Banner.Root valence={status === 'failed' ? 'error' : 'info'}>
                <Banner.Body>{t(`push-status-${status}.message`)}</Banner.Body>
              </Banner.Root>
            )}
            <Form.Fields />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

MessengerSettings.displayName = 'MessengerSettings';
