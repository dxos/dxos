//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';
import { Button, Select, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { type EditorInputMode, EditorInputModes } from '@dxos/ui-editor';

import { meta } from '../../meta';
import { type ScriptSettings } from '../../types';
import { getAccessCredential } from '../../util';

export type ScriptPluginSettingsComponentProps = {
  settings: ScriptSettings;
  onSettingsChange: (fn: (current: ScriptSettings) => ScriptSettings) => void;
};

export const ScriptPluginSettings = ({ settings, onSettingsChange }: ScriptPluginSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();

  // TODO(burdon): Check token.
  const handleAuthenticate = async () => {
    const { identityKey } = client.halo.identity.get()!;
    await client.halo.writeCredentials([getAccessCredential(identityKey as any)]);
  };

  return (
    <Settings.Root>
      <Settings.Section title={t('settings title', { ns: meta.id })}>
        <Settings.Group>
          {/* TODO(wittjosiah): Hide outside of dev environments. */}
          <Settings.ItemInput title={t('authenticate action label')}>
            <Button onClick={handleAuthenticate}>{t('authenticate button label')}</Button>
          </Settings.ItemInput>

          <Settings.ItemInput title={t('editor input mode label')}>
            <Select.Root
              value={settings.editorInputMode ?? 'default'}
              onValueChange={(value) => {
                onSettingsChange((s) => ({ ...s, editorInputMode: value as EditorInputMode }));
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
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
