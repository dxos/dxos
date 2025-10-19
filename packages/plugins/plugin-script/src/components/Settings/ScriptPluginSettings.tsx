//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';
import { Button, Select, useTranslation } from '@dxos/react-ui';
import { type EditorInputMode, EditorInputModes } from '@dxos/react-ui-editor';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type ScriptSettings } from '../../types';
import { getAccessCredential } from '../../util';

export const ScriptPluginSettings = ({ settings }: { settings: ScriptSettings }) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();

  // TODO(burdon): Check token.
  const handleAuthenticate = async () => {
    const { identityKey } = client.halo.identity.get()!;
    await client.halo.writeCredentials([getAccessCredential(identityKey)]);
  };

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <ControlGroup>
          {/* TODO(wittjosiah): Hide outside of dev environments. */}
          <ControlItemInput title={t('authenticate action label')}>
            <Button onClick={handleAuthenticate}>{t('authenticate button label')}</Button>
          </ControlItemInput>

          <ControlItemInput title={t('editor input mode label')}>
            <Select.Root
              value={settings.editorInputMode ?? 'default'}
              onValueChange={(value) => {
                settings.editorInputMode = value as EditorInputMode;
              }}
            >
              <Select.TriggerButton placeholder={t('select editor input mode placeholder')} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {EditorInputModes.map((mode) => (
                      <Select.Option key={mode} value={mode}>
                        {t(`settings editor input mode ${mode} label`)}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
