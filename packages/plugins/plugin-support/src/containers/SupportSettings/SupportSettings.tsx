//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React from 'react';

import { useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppSpace, GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Annotation } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useClient } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

import { WelcomeDismissedAnnotation } from '../../annotations';

export type SupportSettingsProps = AppSurface.SettingsData;

/**
 * Offers "show welcome again" only once the welcome has been dismissed, which is recorded as an
 * annotation on the personal space's properties rather than in plugin settings.
 */
export const SupportSettings = ({ subject }: SupportSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const client = useClient();
  const { invokePromise } = useOperationInvoker();
  const personal = AppSpace.getPersonalSpace(client);
  const [properties, updateProperties] = useObject(personal?.properties);
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
  const welcomeDismissed = properties
    ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;

  const handleShowWelcome = () => {
    if (!personal) {
      return;
    }

    updateProperties((props) => Annotation.set(props, WelcomeDismissedAnnotation, false));
    const workspace = GraphPath.getSpacePath(personal.id);
    void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getSpaceHomePath(personal.id)], workspace });
  };

  const onShowWelcome = welcomeDismissed ? handleShowWelcome : undefined;

  return (
    <Form.Root
      schema={Settings.Settings}
      values={settings}
      variant='settings'
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            {onShowWelcome && (
              <Form.Row label={t('show-welcome.label')}>
                <Button onClick={onShowWelcome}>{t('show-welcome.label')}</Button>
              </Form.Row>
            )}
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SupportSettings.displayName = 'SupportSettings';
