//
// Copyright 2026 DXOS.org
//

import React, { type ComponentProps, useCallback, useMemo } from 'react';

import { Next } from '@dxos/react-ui';
import { Form, type FormFieldRendererProps } from '@dxos/react-ui-form';

import type { FeedbackPluginOption } from './types.ts';

/**
 * Plugin-picker field for the `area` slot of {@link SupportOperation.SupportRequest}.
 *
 * Mirrors the built-in {@link SelectField} (see `packages/ui/react-ui-form/src/components/Form/fields/SelectField.tsx`)
 * but renders the plugin name as the visible label with the id as a dim trailer — the plain
 * SelectField only supports string-keyed options without rich labels.
 *
 * Binds `undefined` to Radix's reserved empty string: passing `undefined` itself would flip the
 * select to uncontrolled and strand its internal state.
 */
type SelectRootProps = ComponentProps<typeof Next.Select.Root>;

export type AreaSelectFieldProps = FormFieldRendererProps<string | undefined> & {
  plugins: ReadonlyArray<FeedbackPluginOption>;
};

/** Reserved sentinel — Radix Select requires non-empty option values. */
const CLEAR_VALUE = '__none__';

export const AreaSelectField = ({
  plugins,
  type,
  readonly,
  label,
  jsonPath,
  presentation,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
}: AreaSelectFieldProps) => {
  const { status, error } = getStatus();
  const value = getValue();

  const handleValueChange = useCallback<NonNullable<SelectRootProps['onValueChange']>>(
    ({ value: [next] }) => onValueChange(type, next === CLEAR_VALUE ? undefined : next),
    [type, onValueChange],
  );

  const items = useMemo(
    () => [
      ...(value != null ? [{ value: CLEAR_VALUE, label: '(none)' }] : []),
      ...plugins.map((plugin) => ({ value: plugin.id, label: plugin.name })),
    ],
    [plugins, value],
  );

  // Static (read-only) presentation: render the resolved name + id, or nothing.
  if ((readonly || presentation === 'static') && value == null) {
    return null;
  }

  const resolved = plugins.find((plugin) => plugin.id === value);

  return (
    <Form.Field path={jsonPath} label={label} error={error} readonly={readonly} presentation={presentation}>
      {presentation === 'static' ? (
        <p>{resolved ? `${resolved.name} (${resolved.id})` : String(value)}</p>
      ) : (
        <Next.Select.Root items={items} value={value ? [value] : []} onValueChange={handleValueChange}>
          <Next.Select.Trigger classNames='w-full' disabled={!!readonly} placeholder={placeholder} />
          <Next.Select.Content>
            {items.map((item) =>
              item.value === CLEAR_VALUE ? (
                <Next.Select.Item key={item.value} item={item}>
                  <Next.Select.ItemText classNames='text-description italic' />
                </Next.Select.Item>
              ) : (
                <Next.Select.Item key={item.value} item={item}>
                  <div className='flex flex-col w-full text-left'>
                    <Next.Select.ItemText />
                    <div className='text-xs text-description font-mono py-1'>{item.value}</div>
                  </div>
                  <Next.Select.ItemIndicator />
                </Next.Select.Item>
              ),
            )}
          </Next.Select.Content>
        </Next.Select.Root>
      )}
    </Form.Field>
  );
};
