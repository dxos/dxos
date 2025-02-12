//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Capabilities, createIntent, useCapability } from '@dxos/app-framework';
import { type S } from '@dxos/echo-schema';
import { getSpaceDisplayName } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { create, Filter, type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { AccessTokenSchema, AccessTokenType } from '@dxos/schema';

import { SpaceSelector } from './SpaceSelector';
import { TokenManager } from './TokenManager';
import { TOKEN_MANAGER_PLUGIN } from '../meta';

const initialValues = {
  note: '',
  source: '',
  token: '',
};

type Form = S.Schema.Type<typeof AccessTokenSchema>;

export const TokensContainer = () => {
  const { t } = useTranslation(TOKEN_MANAGER_PLUGIN);
  const { dispatchPromise: dispatch } = useCapability(Capabilities.IntentDispatcher);
  const client = useClient();
  const spaces = useSpaces();
  const [adding, setAdding] = useState(false);
  const [space, setSpace] = useState(spaces[0]);
  const tokens = useQuery(space, Filter.schema(AccessTokenType));

  const getLabel = useCallback(
    (space: Space) => toLocalizedString(getSpaceDisplayName(space, { personal: space === client.spaces.default }), t),
    [t, client],
  );

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
        <SpaceSelector spaces={spaces} value={space} getLabel={getLabel} onChange={setSpace} />
        <div className='grow' />
        {!adding && <IconButton icon='ph--plus--regular' label={t('add token')} onClick={handleNew} />}
      </div>
      {adding ? (
        <Form schema={AccessTokenSchema} values={initialValues} onCancel={handleCancel} onSave={handleAdd} />
      ) : (
        <TokenManager tokens={tokens} onDelete={handleDelete} />
      )}
    </>
  );
};
