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

import { type Integration } from '../../types';
import { IntegrationManager } from './IntegrationManager';
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
  integrations: Integration.Integration[];
  /** AccessTokens not referenced by any Integration ("Custom tokens" section). */
  bareTokens: AccessToken.AccessToken[];
  adding: boolean;
  spaceId: Key.SpaceId;
  onNew: () => void;
  onCancel: () => void;
  onAdd: (form: TokenForm) => void;
  onDeleteToken: (token: AccessToken.AccessToken) => void;
  onDeleteIntegration: (integration: Integration.Integration) => void;
  onAddAccessToken: (token: AccessToken.AccessToken) => void;
};

/**
 * Unified Integrations panel — primary section lists configured Integrations,
 * secondary "Custom tokens" section lists AccessTokens not wrapped by any Integration.
 *
 * The "+" dropdown drives both: picking an OAuth preset runs the OAuth flow and
 * (via the matching service plugin's AccessTokenCreated handler) auto-creates an
 * Integration; picking "Custom token" creates just an AccessToken (lands in the
 * Custom tokens section).
 */
export const TokensPanel = ({
  integrations,
  bareTokens,
  adding,
  spaceId,
  onNew,
  onCancel,
  onAdd,
  onDeleteToken,
  onDeleteIntegration,
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
            <IntegrationManager integrations={integrations} onDelete={onDeleteIntegration} />
            <NewTokenSelector spaceId={spaceId} onAddAccessToken={onAddAccessToken} onCustomToken={onNew} />
          </Settings.Panel>
        )}
      </Settings.Section>

      {!adding && bareTokens.length > 0 && (
        <Settings.Section
          title={t('custom-tokens.label', { defaultValue: 'Custom tokens' })}
          description={t('custom-tokens.description', {
            defaultValue: 'Access tokens not associated with an integration. Used by scripts and agents.',
          })}
        >
          <Settings.Panel>
            <TokenManager tokens={bareTokens} onDelete={onDeleteToken} />
          </Settings.Panel>
        </Settings.Section>
      )}
    </Settings.Viewport>
  );
};
