//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

import { pingExtension } from '../../util';

export type CrxSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

type TestState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

export const CrxSettings = ({ settings, onSettingsChange }: CrxSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });

  // Round-trip a ping to the extension and report its identity (or why it failed).
  const handleTest = useCallback(async () => {
    setTest({ kind: 'pending' });
    try {
      const info = await pingExtension();
      setTest({
        kind: 'ok',
        message: t('test.connected.message', { name: info.extensionName, version: info.extensionVersion }),
      });
    } catch (err) {
      setTest({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [t]);

  return (
    <Form.Root
      schema={Settings.Settings}
      values={settings}
      variant='settings'
      readonly={!onSettingsChange}
      onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('settings.title')} description={t('settings.description')}>
            <Form.FieldSet />
          </Form.Section>

          <Form.Section title={t('test.title')}>
            <div className='flex gap-2'>
              <IconButton
                disabled={test.kind === 'pending'}
                icon='ph--plug--regular'
                label={t('test.button.label')}
                onClick={handleTest}
              />

              {/* role=status + aria-live so screen readers announce the async outcome. */}
              <div className='flex items-center'>
                <span
                  role='status'
                  aria-live='polite'
                  className={
                    test.kind === 'ok'
                      ? 'text-sm text-success'
                      : test.kind === 'error'
                        ? 'text-sm text-error'
                        : 'text-sm text-description'
                  }
                >
                  {test.kind === 'ok' || test.kind === 'error' ? test.message : ''}
                  {test.kind === 'pending' ? t('test.pending.message') : ''}
                </span>
              </div>
            </div>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
