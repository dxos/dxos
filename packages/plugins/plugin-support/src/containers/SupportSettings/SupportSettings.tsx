//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React from 'react';

import { useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface, SettingsScope, useDefaultSpace, useSettingsSpaceProperties } from '@dxos/app-toolkit/ui';
import { Annotation } from '@dxos/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

import { WelcomeDismissedAnnotation } from '../../annotations';

export type SupportSettingsProps = AppSurface.SettingsData;

/**
 * Offers "show welcome again" only once the welcome has been dismissed, which is recorded as an
 * annotation on the settings space's properties rather than in plugin settings.
 */
export const SupportSettings = ({ subject }: SupportSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const defaultSpace = useDefaultSpace();
  const [properties, updateProperties] = useSettingsSpaceProperties();
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
  const welcomeDismissed = properties
    ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;

  const handleShowWelcome = () => {
    if (!defaultSpace) {
      return;
    }

    updateProperties((props) => Annotation.set(props, WelcomeDismissedAnnotation, false));
    const workspace = GraphPath.getSpacePath(defaultSpace.id);
    void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getSpaceHomePath(defaultSpace.id)], workspace });
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
          <Form.Section
            title={meta.profile.name ?? meta.profile.key}
            actions={<SettingsScope prefix={subject.prefix} />}
          >
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
