//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Button, Icon, Input, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';
import { type Settings } from '#types';

const SERVICE = 'anthropic.com';

export type CodeSettingsProps = {
  settings: Settings.Settings;
  onSettingsChange: (settings: Settings.Settings) => void;
};

export const CodeSettings = ({ settings, onSettingsChange }: CodeSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
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
      Obj.change(existing, (token) => {
        (token as Obj.Mutable<typeof token>).token = value;
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

  const handleEndpointChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSettingsChange({ ...settings, endpoint: event.target.value || undefined });
    },
    [onSettingsChange, settings],
  );

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 space-y-4'>
            <Input.Root>
              <Input.Label>{t('api-key.label')}</Input.Label>
              <Input.TextInput
                type='password'
                placeholder={existing ? t('api-key.placeholder.set') : t('api-key.placeholder.empty')}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </Input.Root>
            <div className='flex gap-2'>
              <Button onClick={handleSave} disabled={!draft.trim() || !space}>
                <Icon icon='ph--floppy-disk--regular' size={4} />
                {t('api-key.save.label')}
              </Button>
              <Button onClick={handleClear} disabled={!existing} variant='ghost'>
                <Icon icon='ph--trash--regular' size={4} />
                {t('api-key.clear.label')}
              </Button>
            </div>
            <Input.Root>
              <Input.Label>{t('endpoint.label')}</Input.Label>
              <Input.TextInput
                value={settings.endpoint ?? ''}
                placeholder={t('endpoint.placeholder')}
                onChange={handleEndpointChange}
              />
            </Input.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

export default CodeSettings;
