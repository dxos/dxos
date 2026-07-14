//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { AccessToken } from '@dxos/cursor';
import { Filter, Obj } from '@dxos/echo';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

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
  const touchedRef = useRef(false);

  // The token is write-only (never rendered back), so the input rests empty.
  // Persist on blur, but only when the field was actually edited — an untouched
  // blur must not be read as "clear" and wipe an existing token. A trimmed-empty
  // value after editing removes the token.
  const handleCommit = useCallback(() => {
    if (!touchedRef.current || !space) {
      return;
    }
    touchedRef.current = false;
    const value = draft.trim();
    if (value) {
      if (existing) {
        Obj.update(existing, (existing) => {
          (existing as Obj.Mutable<typeof existing>).token = value;
        });
      } else {
        space.db.add(Obj.make(AccessToken.AccessToken, { source: SERVICE, token: value }));
      }
    } else if (existing) {
      space.db.remove(existing);
    }
    setDraft('');
  }, [draft, existing, space]);

  return (
    <Form.Root
      schema={SettingsType.Settings}
      values={settings}
      variant='settings'
      onValuesChanged={(values) => onSettingsChange({ ...settings, ...values })}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.Row label={t('api-key.label')}>
              <Input.Root>
                <Input.TextInput
                  type='password'
                  placeholder={existing ? t('api-key.set.placeholder') : t('api-key.empty.placeholder')}
                  value={draft}
                  onChange={(event) => {
                    touchedRef.current = true;
                    setDraft(event.target.value);
                  }}
                  onBlur={handleCommit}
                />
              </Input.Root>
            </Form.Row>
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

export default CodeSettings;

CodeSettings.displayName = 'CodeSettings';
