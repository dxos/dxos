//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { LayoutOperation, getPersonalSpace, getSpacePath } from '@dxos/app-toolkit';
import { Annotation, Obj } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

import { WelcomeDismissedAnnotation } from '../../annotations';
import { SPACE_HOME_NODE_ID } from '../../constants';

export type SupportSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const SupportSettings = ({ settings, onSettingsChange }: SupportSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const { invokePromise } = useOperationInvoker();

  const handleShowWelcome = useCallback(() => {
    const personal = getPersonalSpace(client);
    if (!personal) {
      return;
    }
    // Clear the dismissed flag on the personal space, then open its Home page (where Welcome lives).
    Obj.update(personal.properties, (properties) => {
      Annotation.set(properties, WelcomeDismissedAnnotation, false);
    });
    // Switch to the personal space's workspace (we may be in the settings workspace) and open Home.
    const workspace = getSpacePath(personal.id);
    void invokePromise(LayoutOperation.Open, {
      subject: [`${workspace}/${SPACE_HOME_NODE_ID}`],
      workspace,
    });
  }, [client, invokePromise]);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.FieldSet
          readonly={!onSettingsChange}
          schema={Settings.Settings}
          values={settings}
          onValuesChanged={(values) => onSettingsChange?.(() => values)}
        />
        <Button onClick={handleShowWelcome}>{t('show-welcome.button')}</Button>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
