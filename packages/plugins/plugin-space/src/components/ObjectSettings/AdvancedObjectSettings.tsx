//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Obj } from '@dxos/echo';
import { ForeignKey } from '@dxos/echo-schema';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '../../meta';

import { ForeignKeys } from './ForeignKeys';

const initialValues = {
  source: '',
  id: '',
};

export type AdvancedObjectSettingsProps = {
  object: Obj.Any;
};

export const AdvancedObjectSettings = ({ object }: AdvancedObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const [adding, setAdding] = useState(false);
  const { keys } = Obj.getMeta(object);

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

      {adding && (
        <Form
          outerSpacing={false}
          schema={ForeignKey}
          values={initialValues}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
