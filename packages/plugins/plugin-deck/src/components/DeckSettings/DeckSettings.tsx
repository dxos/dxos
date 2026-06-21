//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

const isSocket = !!(globalThis as any).__args;

export type DeckSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const DeckSettings = ({ settings, onSettingsChange }: DeckSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Form.Root
      variant='settings'
      schema={Settings.Settings}
      values={settings}
      readonly={!onSettingsChange}
      onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('settings.title', { ns: meta.profile.key })}>
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
