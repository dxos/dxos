//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import React, { useCallback, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Separator, useTranslation } from '@dxos/react-ui';
import { ControlItem, ControlPage, ControlSection, Form, controlItemClasses } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';
import { TokenManagerAction } from '../types';

import { NewTokenSelector } from './NewTokenSelector';
import { TokenManager } from './TokenManager';

const initialValues = {
  note: '',
  source: '',
  token: '',
};

const FormSchema = DataType.AccessToken.pipe(Schema.omit('id'));
type TokenForm = Schema.Schema.Type<typeof FormSchema>;

export const TokensContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const [adding, setAdding] = useState(false);
  const tokens = useQuery(space, Filter.type(DataType.AccessToken));

  const handleNew = useCallback(() => setAdding(true), []);
  const handleCancel = useCallback(() => setAdding(false), []);

  const handleAddAccessToken = useCallback(
    async (token: DataType.AccessToken) => {
      // TODO(ZaymonFC): Is there a more ergonomic way to do this intent chain?
      const result = await dispatch(
        createIntent(SpaceAction.AddObject, { object: token, target: space, hidden: true }),
      );

      if (Obj.instanceOf(DataType.AccessToken, result.data?.object)) {
        void dispatch(createIntent(TokenManagerAction.AccessTokenCreated, { accessToken: result.data?.object }));
      }
    },
    [space, dispatch],
  );

  const handleAdd = useCallback(
    async (form: TokenForm) => {
      const token = Obj.make(DataType.AccessToken, form);
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
          title={t('integrations verbose label', { ns: meta.id })}
          description={t('integrations description', { ns: meta.id })}
        >
          {adding ? (
            <ControlItem title={t('new integration label')}>
              <Form
                outerSpacing={false}
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
