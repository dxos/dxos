//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Button, Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { Field } from './Field';
import { translationKey } from '../translations';
import { FieldScalarType, type FieldType, getUniqueProperty, type ViewType } from '../types';

export type ViewEditorProps = ThemedClassName<{
  view: ViewType;
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
// TODO(burdon): Are views always flat projections?
export const ViewEditor = ({ classNames, view, readonly }: ViewEditorProps) => {
  const { t } = useTranslation(translationKey);
  const [field, setField] = useState<FieldType | undefined>();

  const handleAdd = () => {
    const field: FieldType = { path: getUniqueProperty(view), type: FieldScalarType.String };
    view.fields.push(field);
    setField(field);
  };

  const handleDelete = (i: number) => {
    view.fields.splice(i, 1);
  };

  return (
    <div role='none' className={mx('flex flex-col w-full gap-2 divide-y divide-separator', classNames)}>
      {/* TODO(burdon): Re-use list with drag-and-drop. */}
      <div className='w-full'>
        <div className='grid grid-cols-[32px_1fr_32px]'>
          <div />
          <div>{t('field path label')}</div>
        </div>
        <div>
          {view.fields.map((field, i) => (
            // NOTE: Use `i` as the key since the property might change.
            <div key={i} className={mx('grid grid-cols-[32px_1fr_32px]', ghostHover)}>
              <div className='flex items-center justify-center'>
                <Icon icon='ph--dots-six--regular' size={4} />
              </div>
              <div className='flex min-bs-[2rem] items-center cursor-pointer' onClick={() => setField(field)}>
                {field.path}
              </div>
              <div className='flex items-center justify-center' onClick={() => handleDelete(i)}>
                <Icon icon='ph--x--regular' classNames='cursor-pointer' size={4} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {field && <Field classNames='p-2' autoFocus field={field} schema={view.schema} />}
      {!readonly && (
        <div className='flex justify-center'>
          <Button onClick={handleAdd}>
            <Icon icon='ph--plus--regular' size={4} />
          </Button>
        </div>
      )}
    </div>
  );
};
