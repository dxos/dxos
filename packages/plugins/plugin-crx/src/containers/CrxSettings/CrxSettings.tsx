//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Flex, IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

import { pingExtension } from '../../util/index.ts';

type TestState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

export type CrxSettingsProps = AppSurface.SettingsData<{ readonly?: boolean }>;

/**
 * Settings panel for the browser extension: edits the plugin's schema-driven settings and offers a
 * round-trip connection test against the extension's content relay.
 */
export const CrxSettings = ({ subject, readonly }: CrxSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
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
      readonly={readonly}
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key} description={t('settings.description')}>
            <Form.FieldSet />
          </Form.Section>

          <Form.Section title={t('test.title')}>
            <Flex gap='sm'>
              <IconButton
                disabled={test.kind === 'pending'}
                icon='ph--plug--regular'
                label={t('test.button.label')}
                onClick={handleTest}
              />

              {/* role=status + aria-live so screen readers announce the async outcome. */}
              <Flex align='center'>
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
              </Flex>
            </Flex>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

CrxSettings.displayName = 'CrxSettings';
