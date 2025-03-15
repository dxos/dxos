//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type ForeignKey, ForeignKeySchema } from '@dxos/echo-schema';
import { getMeta, type ReactiveEchoObject } from '@dxos/react-client/echo';
import { IconButton, useTranslation, Separator } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { ForeignKeys } from './ForeignKeys';
import { SPACE_PLUGIN } from '../../meta';

const initialValues = {
  source: '',
  id: '',
};

export type AdvancedObjectSettingsProps = {
  object: ReactiveEchoObject<any>;
};

export const AdvancedObjectSettings = ({ object }: AdvancedObjectSettingsProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const [adding, setAdding] = useState(false);
  const keys = getMeta(object).keys;

  const handleNew = useCallback(() => setAdding(true), []);
  const handleCancel = useCallback(() => setAdding(false), []);
  const handleSave = useCallback(
    (key: ForeignKey) => {
      const index = keys.findIndex(({ source, id }) => source === key.source && id === key.id);
      if (index === -1) {
        keys.push(key);
      }
      setAdding(false);
    },
    [keys],
  );
  const handleDelete = useCallback(
    (key: ForeignKey) => {
      const index = keys.findIndex(({ source, id }) => source === key.source && id === key.id);
      if (index !== -1) {
        keys.splice(index, 1);
      }
    },
    [keys],
  );

  // TODO(wittjosiah): This should be wrapped in an "Advanced" accordion.
  return (
    <>
      <Separator />
      <div className='p-2 flex flex-col gap-4'>
        <h2>{t('advanced settings label')}</h2>
        <div className='flex items-center'>
          <h3 className='text-sm font-semibold'>{t('foreign keys')}</h3>
          <div className='grow' />
          <IconButton
            classNames={adding && 'invisible'}
            icon='ph--plus--regular'
            label={t('add key')}
            onClick={handleNew}
          />
        </div>
        {!adding && <ForeignKeys keys={keys} onDelete={handleDelete} />}
      </div>
      {adding && <Form schema={ForeignKeySchema} values={initialValues} onSave={handleSave} onCancel={handleCancel} />}
    </>
  );
};
