//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type S } from '@dxos/echo-schema';
import { SpaceAction } from '@dxos/plugin-space/types';
import { create, Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { AccessTokenSchema, AccessTokenType } from '@dxos/schema';

import { OAuthPresetSelector } from './OAuthPresetSelector';
import { TokenManager } from './TokenManager';
import { TOKEN_MANAGER_PLUGIN } from '../meta';

const initialValues = {
  note: '',
  source: '',
  token: '',
};

type Form = S.Schema.Type<typeof AccessTokenSchema>;

export const TokensContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(TOKEN_MANAGER_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const [adding, setAdding] = useState(false);
  const tokens = useQuery(space, Filter.schema(AccessTokenType));

  const handleNew = useCallback(() => setAdding(true), []);
  const handleCancel = useCallback(() => setAdding(false), []);
  const handleAdd = useCallback(
    async (form: Form) => {
      await dispatch(createIntent(SpaceAction.AddObject, { object: create(AccessTokenType, form), target: space }));
      setAdding(false);
    },
    [space],
  );
  const handleDelete = useCallback((token: AccessTokenType) => space.db.remove(token), [space]);

  return (
    <>
      <div className='flex mbe-4'>
        <div className='grow' />
        {!adding && <IconButton icon='ph--plus--regular' label={t('add token')} onClick={handleNew} />}
        {!adding && <OAuthPresetSelector space={space} />}
      </div>
      {adding ? (
        <Form schema={AccessTokenSchema} values={initialValues} onCancel={handleCancel} onSave={handleAdd} />
      ) : (
        <TokenManager tokens={tokens} onDelete={handleDelete} />
      )}
    </>
  );
};
