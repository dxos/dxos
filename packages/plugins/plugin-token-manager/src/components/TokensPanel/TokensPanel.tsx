//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { type Key } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Form, Settings } from '@dxos/react-ui-form';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';

import { NewTokenSelector } from './NewTokenSelector';
import { TokenManager } from './TokenManager';

const initialValues = {
  note: '',
  source: '',
  token: '',
};

const FormSchema = AccessToken.AccessToken.pipe(Schema.omit('id'));
type TokenForm = Schema.Schema.Type<typeof FormSchema>;

export type TokensPanelProps = {
  tokens: AccessToken.AccessToken[];
  adding: boolean;
  spaceId: Key.SpaceId;
  onNew: () => void;
  onCancel: () => void;
  onAdd: (form: TokenForm) => void;
  onDelete: (token: AccessToken.AccessToken) => void;
  onAddAccessToken: (token: AccessToken.AccessToken) => void;
};

export const TokensPanel = ({
  tokens,
  adding,
  spaceId,
  onNew,
  onCancel,
  onAdd,
  onDelete,
  onAddAccessToken,
}: TokensPanelProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Viewport>
      <Settings.Section title={t('integrations-verbose.label')} description={t('integrations.description')}>
        {adding ? (
          <Settings.Item title={t('new-integration.label')} description={t('new-integration.description')}>
            <Form.Root schema={FormSchema} values={initialValues} onCancel={onCancel} onSave={onAdd}>
              <Form.FieldSet />
              <Form.Actions />
            </Form.Root>
          </Settings.Item>
        ) : (
          <Settings.Panel>
            <TokenManager tokens={tokens} onDelete={onDelete} />
            <NewTokenSelector spaceId={spaceId} onAddAccessToken={onAddAccessToken} onCustomToken={onNew} />
          </Settings.Panel>
        )}
      </Settings.Section>
    </Settings.Viewport>
  );
};
