//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Select from '@dxos/react-ui/Select';
import * as Typography from '@dxos/react-ui/Typography';
import { hues } from '@dxos/ui-types';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { presentationFor } from '../presentation.tsx';

export type SelectFieldOption = {
  value: string | number;
  label?: string;
  icon?: string;
  /** A hue name for the icon (a schema option's `color`); a name that is no hue is ignored. */
  iconHue?: string;
};

const NONE = '@dxos/react-ui-form/none';

export type SelectFieldProps = FormFieldRendererProps & {
  options?: SelectFieldOption[];
};

/**
 * `Select` over literal options. Next options are strings (AUDIT 2.14), so the field keeps the map back to each
 * literal; the popup inherits the row's size (Phase 4 decision 2).
 */
export const SelectField = ({
  type,
  readonly,
  required,
  label,
  placeholder,
  icon,
  jsonPath,
  options = [],
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: SelectFieldProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const pill = presentation === 'pill';
  const items = useMemo<Select.Option[]>(
    () => [
      ...(pill && !required ? [{ value: NONE, label: t('select-none.label'), icon }] : []),
      ...options.map(({ value, label, icon, iconHue }) => ({
        value: String(value),
        label: label ?? String(value),
        icon,
        iconHue: hues.find((hue) => hue === iconHue),
      })),
    ],
    [options, pill, required, icon, t],
  );
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return (
      <Typography.Text truncate>
        {options.find((option) => option.value === value)?.label ?? String(value ?? '')}
      </Typography.Text>
    );
  }

  return (
    <SelectControl
      items={items}
      value={value == null ? undefined : String(value)}
      placeholder={pill ? label : (placeholder ?? t('select.placeholder'))}
      readonly={readonly}
      pill={pill}
      icon={icon}
      testId={jsonPath}
      onValueChange={(next) => {
        // A choice is a commit: the select never blurs, so it commits itself.
        onValueChange(type, options.find((option) => String(option.value) === next)?.value);
        onBlur();
      }}
    />
  );
};

type SelectControlProps = {
  items: Select.Option[];
  value?: string;
  placeholder?: string;
  readonly?: boolean;
  /** Options are still loading: the trigger shows a spinner and is `aria-busy`. */
  loading?: boolean;
  /** The trigger as a pill (see `Select.Trigger`'s `pill`). */
  pill?: boolean;
  /** The field's glyph, where the chosen option has none. */
  icon?: string;
  testId?: string;
  onValueChange: (value: string | undefined) => void;
};

/** The Select a field row holds: Ark reads the enclosing `Field.Root` for the label and state ids. */
export const SelectControl = ({
  items,
  value,
  placeholder,
  readonly,
  loading,
  pill,
  icon,
  testId,
  onValueChange,
}: SelectControlProps) => (
  <Select.Root
    items={items}
    value={value === undefined ? [] : [value]}
    disabled={!!readonly}
    onValueChange={({ value: [next] }) => onValueChange(next)}
  >
    <Select.Trigger placeholder={placeholder} loading={loading} pill={pill} icon={icon} data-testid={testId} />
    <Select.Content>
      {items.map((item) => (
        <Select.Item key={item.value} item={item} />
      ))}
    </Select.Content>
  </Select.Root>
);
