//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, Icon, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

import { pingExtension } from '../../util';

export type ExtensionSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

type TestState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

export const ExtensionSettings = ({ settings, onSettingsChange }: ExtensionSettingsProps) => {
  const { t } = useTranslation(meta.id);
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
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title')}>
        <SettingsForm.FieldSet
          readonly={!onSettingsChange}
          schema={Settings.Settings}
          values={settings}
          onValuesChanged={(values) => onSettingsChange?.(() => values)}
        />
      </SettingsForm.Section>

      <SettingsForm.Section title={t('test.title')}>
        <div className='flex items-center gap-2'>
          <Button onClick={handleTest} disabled={test.kind === 'pending'}>
            <Icon icon='ph--plug--regular' size={4} classNames='mie-2' />
            {t('test.button.label')}
          </Button>
          {/* role=status + aria-live so screen readers announce the async outcome. */}
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
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
