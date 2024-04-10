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
  tableDefs: TableDef[];
  onUpdate?: ((id: string, column: ColumnProps) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onClose?: () => void;
};

export const ColumnSettingsForm = ({
  column,
  tableDef,
  tableDefs,
  onUpdate,
  onDelete,
  onClose,
}: ColumnSettingsFormProps) => {
  const [prop, setProp] = useState(column.id);
  const [refTable, setRefTable] = useState(column.refTable);
  const [refProp, setRefProp] = useState(column.refProp);
  const [type, setType] = useState(String(column.type));
  const [label, setLabel] = useState(column.label);
  const [digits, setDigits] = useState(String(column.digits ?? '0'));
  const propRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation(translationKey);

  const handleCancel = () => {
    setProp(column.id);
    onClose?.();
  };

  const handleSave = () => {
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

    onUpdate?.(prop, {
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

  return (
    <div className='flex flex-col gap-1'>
      <Section>
        <Input.Root>
          <Input.Label classNames='mbe-1'>{t('column label label')}</Input.Label>
          <Input.TextInput
            placeholder='Column label'
            value={label ?? ''}
            onChange={(event) => setLabel(event.target.value)}
            autoFocus
          />
        </Input.Root>
        <Input.Root>
          <Input.Label classNames='mbe-1 mbs-3'>{t('property key label')}</Input.Label>
          <Input.TextInput
            ref={propRef}
            placeholder='Property key'
            // TODO(burdon): Provide hooks for value normalization, ENTER, ESC, etc.
            value={prop ?? ''}
            onChange={(event) => setProp(event.target.value.replace(/[^\w_]/g, ''))}
          />
        </Input.Root>
        <Input.Root>
          <Input.Label classNames='mbe-1 mbs-3'>{t('column type label')}</Input.Label>
          <Select.Root value={type} onValueChange={setType}>
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

      {type === 'number' && (
        <>
          <Section>
            <Input.Root>
              <Input.Label classNames='mbe-1 mbs-3'>{t('digits label')}</Input.Label>
              {/* TODO(burdon): Constrain input to numbers. */}
              <Input.TextInput value={digits ?? ''} onChange={(event) => setDigits(event.target.value)} />
            </Input.Root>
          </Section>
        </>
      )}

      {/* TODO(burdon): Selectors on same line. */}
      {type === 'ref' && (
        <>
          <Section>
            <Input.Root>
              <Input.Label classNames='mbe-1 mbs-3'>Table</Input.Label>
              <Select.Root value={refTable} onValueChange={setRefTable}>
                <Select.TriggerButton placeholder='Table' classNames='is-full' />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {tableDefs
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

            {refTable && (
              <Input.Root>
                <Input.Label classNames='mbe-1 mbs-3'>Table property</Input.Label>
                <Select.Root value={refProp} onValueChange={setRefProp}>
                  <Select.TriggerButton placeholder='Property' classNames='is-full' />
                  <Select.Portal>
                    <Select.Content>
                      <Select.Viewport>
                        {tableDefs
                          .find((tableDef) => tableDef.id === refTable)
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
        </>
      )}

      <Separator classNames='mli-2' />

      <Section className='space-b-1.5'>
        {/* TODO(burdon): Style as DropdownMenuItem. */}
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
        <Button classNames='is-full flex gap-2' onClick={() => onDelete?.(column.id)}>
          <span>{t('delete label')}</span>
          <div className='grow' />
          <Trash className={getSize(5)} />
        </Button>
      </Section>
    </div>
  );
};
