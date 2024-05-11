//
// Copyright 2024 DXOS.org
//
import { Check, Trash, X } from '@phosphor-icons/react';
import React, { type FC, type PropsWithChildren, useRef, useState } from 'react';

import { Button, Input, Select, Separator, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { safeParseInt } from '@dxos/util';

import { type TableDef, type ColumnProps, type ColumnType } from '../../schema';
import { translationKey } from '../../translations';

const Section: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => (
  <div role='none' className={mx('p-2', className)}>
    {children}
  </div>
);

export type ColumnSettingsFormProps = {
  column: ColumnProps;
  tableDef: TableDef;
  tablesToReference: TableDef[];
  onUpdate?: ((id: string, column: ColumnProps) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onClose?: () => void;
};

export const ColumnSettingsForm = ({
  column,
  tableDef,
  tablesToReference,
  onUpdate,
  onDelete,
  onClose,
}: ColumnSettingsFormProps) => {
  const [formState, setFormState] = useState({
    prop: column.id,
    refTable: column.refTable,
    refProp: column.refProp,
    type: String(column.type),
    label: column.label,
    digits: String(column.digits ?? '0'),
  });

  const propRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation(translationKey);

  const handleCancel = () => {
    onClose?.();
  };

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
      type: type as ColumnProps['type'],
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

  return (
    <div className='flex flex-col gap-1'>
      <Section>
        <Input.Root>
          <Input.Label classNames='mbe-1'>{t('column label label')}</Input.Label>
          <Input.TextInput
            placeholder='Column label'
            value={formState.label ?? ''}
            onChange={(event) => setFormState((prevState) => ({ ...prevState, label: event.target.value }))}
            autoFocus
          />
        </Input.Root>
        <Input.Root>
          <Input.Label classNames='mbe-1 mbs-3'>{t('property key label')}</Input.Label>
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
          <Input.Label classNames='mbe-1 mbs-3'>{t('column type label')}</Input.Label>
          <Select.Root
            value={formState.type}
            onValueChange={(value) => setFormState((prevState) => ({ ...prevState, type: value }))}
          >
            <Select.TriggerButton placeholder='Type' classNames='is-full' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {(['number', 'boolean', 'string', 'ref'] as ColumnType[]).map((type) => (
                    <Select.Option key={type} value={type}>
                      {t(`${type} column type label`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Input.Root>
      </Section>
      {formState.type === 'number' && (
        <Section>
          <Input.Root>
            <Input.Label classNames='mbe-1 mbs-3'>{t('digits label')}</Input.Label>
            <Input.TextInput
              value={formState.digits ?? ''}
              onChange={(event) => setFormState((prevState) => ({ ...prevState, digits: event.target.value }))}
            />
          </Input.Root>
        </Section>
      )}

      {formState.type === 'ref' && (
        <Section>
          <Input.Root>
            <Input.Label classNames='mbe-1 mbs-3'>Table</Input.Label>
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
              <Input.Label classNames='mbe-1 mbs-3'>Table property</Input.Label>
              <Select.Root
                value={formState.refProp}
                onValueChange={(value) => setFormState((prevState) => ({ ...prevState, refProp: value }))}
              >
                <Select.TriggerButton placeholder='Property' classNames='is-full' />
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
        </Section>
      )}

      <Separator classNames='mli-2' />

      <Section className='space-b-1.5'>
        <Button variant='primary' classNames='is-full flex gap-2' onClick={handleSave}>
          <span>{t('save label')}</span>
          <div className='grow' />
          <Check className={getSize(5)} />
        </Button>
        <Button classNames='is-full flex gap-2' onClick={handleCancel}>
          <span>{t('cancel label', { ns: 'os' })}</span>
          <div className='grow' />
          <X className={getSize(5)} />
        </Button>
        <Button classNames='is-full flex gap-2' onClick={handleDelete}>
          <span>{t('delete label')}</span>
          <div className='grow' />
          <Trash className={getSize(5)} />
        </Button>
      </Section>
    </div>
  );
};
