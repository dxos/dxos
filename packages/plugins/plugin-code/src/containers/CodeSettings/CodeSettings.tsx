//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Button, Icon, Input, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';
import { Settings as SettingsType } from '#types';

const SERVICE = 'anthropic.com';

export type CodeSettingsProps = {
  settings: SettingsType.Settings;
  onSettingsChange: (settings: SettingsType.Settings) => void;
};

/**
 * Settings panel for the Code plugin: manages the Anthropic API key (stored as
 * an ECHO `AccessToken`) and the schema-driven build-service `endpoint`.
 */
export const CodeSettings = ({ settings, onSettingsChange }: CodeSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const spaces = useSpaces();
  const space = spaces[0];
  const tokens = useQuery(space?.db, Filter.type(AccessToken.AccessToken, { source: SERVICE }));
  const existing = tokens[0];
  const [draft, setDraft] = useState('');

  const handleSave = useCallback(() => {
    const value = draft.trim();
    if (!value || !space) {
      return;
    }
    if (existing) {
      Obj.update(existing, (existing) => {
        (existing as Obj.Mutable<typeof existing>).token = value;
      });
    } else {
      space.db.add(Obj.make(AccessToken.AccessToken, { source: SERVICE, token: value }));
    }
    setDraft('');
  }, [draft, existing, space]);

  const handleClear = useCallback(() => {
    if (existing && space) {
      space.db.remove(existing);
    }
  }, [existing, space]);

  return (
    <Settings.Viewport>
      <Settings.Section title={meta.profile.name ?? meta.profile.key}>
        <Settings.Item title={t('api-key.label')}>
          <Input.TextInput
            type='password'
            placeholder={existing ? t('api-key.set.placeholder') : t('api-key.empty.placeholder')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className='flex justify-end gap-2 pt-trim-md'>
            <Button onClick={handleSave} disabled={!draft.trim() || !space}>
              <Icon icon='ph--floppy-disk--regular' size={4} />
              {t('api-key.save.label')}
            </Button>
            <Button onClick={handleClear} disabled={!existing} variant='ghost'>
              <Icon icon='ph--trash--regular' size={4} />
              {t('api-key.clear.label')}
            </Button>
          </div>
        </Settings.Item>
        <Settings.FieldSet schema={SettingsType.Settings} values={settings} onValuesChanged={onSettingsChange} />
      </Settings.Section>
    </Settings.Viewport>
  );
};

export default CodeSettings;
