//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import React, { useCallback, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { SpaceAction } from '@dxos/plugin-space/types';
import { live, Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Separator, useTranslation } from '@dxos/react-ui';
import { ControlItem, controlItemClasses, ControlPage, ControlSection, Form } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { NewTokenSelector } from './NewTokenSelector';
import { TokenManager } from './TokenManager';
import { TOKEN_MANAGER_PLUGIN } from '../meta';
import { TokenManagerAction } from '../types';

const initialValues = {
  note: '',
  source: '',
  token: '',
};

const FormSchema = DataType.AccessToken.pipe(Schema.omit('id'));
type TokenForm = Schema.Schema.Type<typeof FormSchema>;

export const TokensContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(TOKEN_MANAGER_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const [adding, setAdding] = useState(false);
  const tokens = useQuery(space, Filter.schema(DataType.AccessToken));

  const handleNew = useCallback(() => setAdding(true), []);
  const handleCancel = useCallback(() => setAdding(false), []);

  const handleAddAccessToken = useCallback(
    async (token: DataType.AccessToken) => {
      // TODO(ZaymonFC): Is there a more ergonomic way to do this intent chain?
      const result = await dispatch(
        createIntent(SpaceAction.AddObject, { object: token, target: space, hidden: true }),
      );
      if (isInstanceOf(DataType.AccessToken, result.data?.object)) {
        void dispatch(createIntent(TokenManagerAction.AccessTokenCreated, { accessToken: result.data?.object }));
      }
    },
    [space, dispatch],
  );

  const handleAdd = useCallback(
    async (form: TokenForm) => {
      const token = live(DataType.AccessToken, form);
      await handleAddAccessToken(token);
      setAdding(false);
    },
    [handleAddAccessToken],
  );

  const handleDelete = useCallback((token: DataType.AccessToken) => space.db.remove(token), [space]);

  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <ControlPage>
        <ControlSection
          title={t('integrations verbose label', { ns: TOKEN_MANAGER_PLUGIN })}
          description={t('integrations description', { ns: TOKEN_MANAGER_PLUGIN })}
        >
          {adding ? (
            <ControlItem title={t('new integration label')}>
              <Form
                classNames='p-0'
                schema={FormSchema}
                values={initialValues}
                onCancel={handleCancel}
                onSave={handleAdd}
              />
            </ControlItem>
          ) : (
            <div role='none' className={controlItemClasses}>
              <TokenManager tokens={tokens} onDelete={handleDelete} />
              {tokens.length > 0 && <Separator classNames='mlb-4' />}
              <NewTokenSelector space={space} onAddAccessToken={handleAddAccessToken} onCustomToken={handleNew} />
            </div>
          )}
        </ControlSection>
      </ControlPage>
    </StackItem.Content>
  );
};
