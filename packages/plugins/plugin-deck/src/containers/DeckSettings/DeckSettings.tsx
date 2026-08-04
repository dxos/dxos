//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

const isSocket = !!(globalThis as any).__args;

export type DeckSettingsProps = AppSurface.SettingsData;

export const DeckSettings = ({ subject }: DeckSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return (
    <Form.Root
      variant='settings'
      schema={Settings.Settings}
      values={settings}
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.FieldSet
              filter={(properties) =>
                isSocket ? properties.filter((property) => property.name !== 'enableNativeRedirect') : properties
              }
            />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

DeckSettings.displayName = 'DeckSettings';
