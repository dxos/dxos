//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/react';
import { type Database, Filter, Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { useQuery } from '@dxos/react-client/echo';
import { Separator, useTranslation } from '@dxos/react-ui';
import { ControlItem, ControlPage, ControlSection, Form, controlItemClasses } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { AccessToken } from '@dxos/types';

import { meta } from '../meta';
import { TokenManagerOperation } from '../types';

import { NewTokenSelector } from './NewTokenSelector';
import { TokenManager } from './TokenManager';

const initialValues = {
  note: '',
  source: '',
  token: '',
};

const FormSchema = AccessToken.AccessToken.pipe(Schema.omit('id'));
type TokenForm = Schema.Schema.Type<typeof FormSchema>;

export const TokensContainer = ({ db }: { db: Database.Database }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [adding, setAdding] = useState(false);
  const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));

  const handleNew = useCallback(() => setAdding(true), []);
  const handleCancel = useCallback(() => setAdding(false), []);

  const handleAddAccessToken = useCallback(
    async (token: AccessToken.AccessToken) => {
      const result = await invokePromise(SpaceOperation.AddObject, {
        object: token,
        target: db,
        hidden: true,
      });

      if (Obj.instanceOf(AccessToken.AccessToken, result.data?.object)) {
        void invokePromise(TokenManagerOperation.AccessTokenCreated, { accessToken: result.data?.object });
      }
    },
    [db, invokePromise],
  );

  const handleAdd = useCallback(
    async (form: TokenForm) => {
      const token = Obj.make(AccessToken.AccessToken, form);
      await handleAddAccessToken(token);
      setAdding(false);
    },
    [handleAddAccessToken],
  );

  const handleDelete = useCallback((token: AccessToken.AccessToken) => db.remove(token), [db]);

  return (
    <StackItem.Content scrollable>
      <ControlPage>
        <ControlSection
          title={t('integrations verbose label', { ns: meta.id })}
          description={t('integrations description', { ns: meta.id })}
        >
          {adding ? (
            <ControlItem title={t('new integration label')}>
              <Form.Root schema={FormSchema} values={initialValues} onCancel={handleCancel} onSave={handleAdd}>
                <Form.FieldSet />
                <Form.Actions />
              </Form.Root>
            </ControlItem>
          ) : (
            <div role='none' className={controlItemClasses}>
              <TokenManager tokens={tokens} onDelete={handleDelete} />
              {tokens.length > 0 && <Separator classNames='mlb-4' />}
              <NewTokenSelector
                spaceId={db.spaceId}
                onAddAccessToken={handleAddAccessToken}
                onCustomToken={handleNew}
              />
            </div>
          )}
        </ControlSection>
      </ControlPage>
    </StackItem.Content>
  );
};
