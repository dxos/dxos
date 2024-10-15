//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { Button, Input, Select, useTranslation } from '@dxos/react-ui';
import { FieldValueTypes, type FieldValueType } from '@dxos/schema';
import { safeParseInt } from '@dxos/util';

import { type TableDef, type ColumnDef } from '../../schema';
import { translationKey } from '../../translations';

export type ColumnSettingsProps = {
  column: ColumnDef;
  tableDef: TableDef;
  // TODO(burdon): Rename.
  tablesToReference: TableDef[];
  onUpdate?: (id: string, column: ColumnDef) => void;
  onDelete?: (id: string) => void;
  onClose?: () => void;
};

/**
 * @deprecated
 */
export const ColumnSettings = ({
  column,
  tableDef,
  tablesToReference,
  onUpdate,
  onDelete,
  onClose,
}: ColumnSettingsProps) => {
  const { t } = useTranslation(translationKey);
  const propRef = useRef<HTMLInputElement>(null);
  const [formState, setFormState] = useState({
    prop: column.id,
    refTable: column.refTable,
    refProp: column.refProp,
    type: String(column.type),
    label: column.label,
    digits: String(column.digits ?? '0'),
  });

  const handleSave = () => {
    const { prop, refTable, refProp, type, label, digits } = formState;

    // Check valid.
    if (!prop.length || !prop.match(/^[a-zA-Z_].+/i)) {
      propRef.current?.focus();
      return;
    }

    // If already exists then check same type.
    const current = tableDef.columns.find((c) => c.id !== column.id && c.id === prop);
    if (current) {
      // TODO(burdon): Allow multiple columns with different refProps. Ensure correct table prop is updated.
      if (current.type !== 'ref' /* || current.ref !== refTable */) {
        // TODO(burdon): Show error.
        propRef.current?.focus();
        return;
      }
    }

    onUpdate?.(column.id, {
      id: prop, // TODO(burdon): Make unique.
      prop,
      label,
      type: type as FieldValueType,
      refTable,
      refProp,
      digits: safeParseInt(digits),
    });
    onClose?.();
  };

  const handleDelete = () => {
    onDelete?.(column.id);
    onClose?.();
  };

  // TODO(burdon): Standardize dialog/popup.
  return (
    <div className='flex flex-col w-full gap-4'>
      <div className='flex flex-col gap-2'>
        <Input.Root>
          <Input.Label>{t('column label label')}</Input.Label>
          <Input.TextInput
            placeholder='Column label'
            value={formState.label ?? ''}
            onChange={(event) => setFormState((prevState) => ({ ...prevState, label: event.target.value }))}
            autoFocus
            data-testid='table.column-settings.label'
          />
        </Input.Root>

        <Input.Root>
          <Input.Label>{t('property key label')}</Input.Label>
          <Input.TextInput
            ref={propRef}
            placeholder='Property key'
            value={formState.prop ?? ''}
            onChange={(event) =>
              setFormState((prevState) => ({ ...prevState, prop: event.target.value.replace(/[^\w_]/g, '') }))
            }
          />
        </Input.Root>

        <Input.Root>
          <Input.Label>{t('column type label')}</Input.Label>
          <Select.Root
            value={formState.type}
            onValueChange={(value) => setFormState((prevState) => ({ ...prevState, type: value }))}
          >
            <Select.TriggerButton classNames='is-full' placeholder='Type' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {FieldValueTypes.map((type) => (
                    <Select.Option key={type} value={type}>
                      {t(`${type} column type label`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Input.Root>

        {formState.type === 'number' && (
          <Input.Root>
            <Input.Label>{t('digits label')}</Input.Label>
            <Input.TextInput
              value={formState.digits ?? ''}
              onChange={(event) => setFormState((prevState) => ({ ...prevState, digits: event.target.value }))}
            />
          </Input.Root>
        )}

        {formState.type === 'ref' && (
          <>
            <Input.Root>
              <Input.Label>Table</Input.Label>
              <Select.Root
                value={formState.refTable}
                onValueChange={(value) => setFormState((prevState) => ({ ...prevState, refTable: value }))}
              >
                <Select.TriggerButton placeholder='Table' classNames='is-full' />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {tablesToReference
                        .filter((t) => t.id !== tableDef.id)
                        .map(({ id, name }) => (
                          <Select.Option key={id} value={id}>
                            {name ?? id}
                          </Select.Option>
                        ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </Input.Root>

            {formState.refTable && (
              <Input.Root>
                <Input.Label>Table property</Input.Label>
                <Select.Root
                  value={formState.refProp}
                  onValueChange={(value) => setFormState((prevState) => ({ ...prevState, refProp: value }))}
                >
                  <Select.TriggerButton placeholder='Property' />
                  <Select.Portal>
                    <Select.Content>
                      <Select.Viewport>
                        {tablesToReference
                          .find((tableDef) => tableDef.id === formState.refTable)
                          ?.columns.map(({ id, label }) => (
                            <Select.Option key={id} value={id}>
                              {label ?? id}
                            </Select.Option>
                          ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </Input.Root>
            )}
          </>
        )}
      </div>

      <div>
        {/* TODO(burdon): Change delete to cancel. Delete should be menu item. */}
        <div className='flex flex-row justify-end gap-1'>
          <Button onClick={handleDelete} data-testid='table.column-settings.delete'>
            {t('delete label')}
          </Button>
          <Button variant='primary' onClick={handleSave} data-testid='table.column-settings.save'>
            {t('save label')}
          </Button>
        </div>
      </div>
    </div>
  );
};
