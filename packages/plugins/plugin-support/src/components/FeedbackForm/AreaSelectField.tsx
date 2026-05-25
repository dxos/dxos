//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Input, Select, type SelectRootProps } from '@dxos/react-ui';
import { type FormFieldComponentProps, FormFieldLabel } from '@dxos/react-ui-form';

import type { FeedbackPluginOption } from './types';

/**
 * Plugin-picker field for the `area` slot of {@link SupportOperation.SupportRequest}.
 *
 * Mirrors the built-in {@link SelectField} (see `packages/ui/react-ui-form/src/components/Form/fields/SelectField.tsx`)
 * but renders the plugin name as the visible label with the id as a dim trailer — the plain
 * SelectField only supports string-keyed options without rich labels. Selection value remains
 * the plugin id so the form payload stays a simple `string`. A "(none)" sentinel clears the
 * selection because Radix Select cannot bind to `undefined`.
 */
export type AreaSelectFieldProps = FormFieldComponentProps<string | undefined> & {
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
  layout,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
}: AreaSelectFieldProps) => {
  const { status, error } = getStatus();
  const value = getValue();

  const handleValueChange = useCallback<NonNullable<SelectRootProps['onValueChange']>>(
    (next) => onValueChange(type, next === CLEAR_VALUE ? undefined : next),
    [type, onValueChange],
  );

  // Static (read-only) layout: render the resolved name + id, or nothing.
  if ((readonly || layout === 'static') && value == null) {
    return null;
  }

  const resolved = plugins.find((plugin) => plugin.id === value);

  return (
    <Input.Root validationValence={status}>
      {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} path={jsonPath} />}
      {layout === 'static' ? (
        <p>{resolved ? `${resolved.name} (${resolved.id})` : String(value)}</p>
      ) : (
        <Select.Root value={value ?? CLEAR_VALUE} onValueChange={handleValueChange}>
          <Select.TriggerButton classNames='w-full' disabled={!!readonly} placeholder={placeholder} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                <Select.Option value={CLEAR_VALUE}>
                  <span className='text-description italic'>(none)</span>
                </Select.Option>
                {plugins.map((plugin) => (
                  <Select.Option key={plugin.id} value={plugin.id} classNames='flex'>
                    <div className='flex flex-col w-full text-left'>
                      <div>{plugin.name}</div>
                      <div className='text-xs text-description font-mono py-1'>{plugin.id}</div>
                    </div>
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
      {layout === 'full' && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
