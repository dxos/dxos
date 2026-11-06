//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Tag from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';

import { translationKey } from '#translations';
import { type FormFieldRendererProps, type RefOption } from '#types';

import { type OptionsLookup, type OptionsLookupEntry } from '../../annotations.ts';
import { lookupKey, pickValues, useAsyncFieldEffect, useFormValues } from '../../hooks/index.ts';
import { ObjectMultiPicker } from '../ObjectPicker.tsx';
import { presentationFor } from '../presentation.tsx';

export type LookupArrayFieldProps = FormFieldRendererProps<readonly string[] | undefined> & {
  /** Loads the values the field may hold. */
  lookup: OptionsLookup;
  /** Chips reorder by drag. */
  ordered: boolean;
};

/**
 * An array of strings picked from an {@link OptionsLookup}, as one multiple selection of chips; a value the lookup
 * does not offer keeps its chip, labelled as written.
 */
export const LookupArrayField = ({
  lookup,
  ordered,
  type,
  readonly,
  label,
  placeholder,
  presentation,
  jsonPath,
  getValue,
  onValueChange,
}: LookupArrayFieldProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const values = useFormValues<AnyProperties>('Form.LookupArrayField');
  const subset = useMemo(() => pickValues(values, lookup.deps), [values, lookup.deps]);
  const key = useMemo(() => lookupKey(lookup, subset), [lookup, subset]);
  const { data } = useAsyncFieldEffect<readonly OptionsLookupEntry[]>(() => lookup.load(subset), key);
  const ids = (getValue() ?? []).map(String);
  const options = useMemo<RefOption[]>(() => {
    const loaded = (data ?? []).map(({ value, label, secondaryLabel, icon }) => ({
      id: value,
      label: label ?? value,
      description: secondaryLabel,
      icon,
    }));
    const missing = ids.filter((id) => !loaded.some((option) => option.id === id));
    return [...loaded, ...missing.map((id) => ({ id, label: id }))];
  }, [data, ids.join('\n')]);

  if (readonly || presentationFor(presentation).isStatic) {
    return ids.length === 0 ? (
      <Typography.Text tone='muted'>{t('empty-readonly-ref-field.label')}</Typography.Text>
    ) : (
      <Button.Group>
        {ids.map((id) => (
          <Tag.Tag key={id}>{options.find((option) => option.id === id)?.label ?? id}</Tag.Tag>
        ))}
      </Button.Group>
    );
  }

  return (
    <ObjectMultiPicker
      value={ids}
      options={options}
      ordered={ordered}
      placeholder={placeholder || label}
      data-testid={jsonPath}
      onValueChange={(next) => onValueChange(type, next)}
    />
  );
};
