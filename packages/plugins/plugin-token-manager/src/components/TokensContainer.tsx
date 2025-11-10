//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Separator, useTranslation } from '@dxos/react-ui';
import { ControlItem, ControlPage, ControlSection, Form, controlItemClasses } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { AccessToken } from '@dxos/types';

import { meta } from '../meta';
import { TokenManagerAction } from '../types';

import { NewTokenSelector } from './NewTokenSelector';
import { TokenManager } from './TokenManager';

const initialValues = {
  note: '',
  source: '',
  token: '',
};

const FormSchema = AccessToken.AccessToken.pipe(Schema.omit('id'));
type TokenForm = Schema.Schema.Type<typeof FormSchema>;

export const TokensContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const [adding, setAdding] = useState(false);
  const tokens = useQuery(space, Filter.type(AccessToken.AccessToken));

  const handleNew = useCallback(() => setAdding(true), []);
  const handleCancel = useCallback(() => setAdding(false), []);

  const handleAddAccessToken = useCallback(
    async (token: AccessToken.AccessToken) => {
      // TODO(ZaymonFC): Is there a more ergonomic way to do this intent chain?
      const result = await dispatch(
        createIntent(SpaceAction.AddObject, {
          object: token,
          target: space,
          hidden: true,
        }),
      );

      if (Obj.instanceOf(AccessToken.AccessToken, result.data?.object)) {
        void dispatch(createIntent(TokenManagerAction.AccessTokenCreated, { accessToken: result.data?.object }));
      }
    },
    [space, dispatch],
  );

  const handleAdd = useCallback(
    async (form: TokenForm) => {
      const token = Obj.make(AccessToken.AccessToken, form);
      await handleAddAccessToken(token);
      setAdding(false);
    },
    [handleAddAccessToken],
  );

  const handleDelete = useCallback((token: AccessToken.AccessToken) => space.db.remove(token), [space]);

  return (
    <StackItem.Content scrollable>
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
