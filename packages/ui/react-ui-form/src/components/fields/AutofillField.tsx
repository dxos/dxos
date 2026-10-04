//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';

import { type FormFieldRendererProps } from '#types';

import { type Autofill } from '../../annotations.ts';
import { pickValues, useAsyncFieldEffect, useFormValues } from '../../hooks/index.ts';
import { TextField } from './TextField.tsx';

export type AutofillFieldProps = FormFieldRendererProps<string> & {
  /** Derives this field's value from the autofill's declared dependency fields (e.g. a sibling URL). */
  autofill: Autofill;
};

/**
 * A text field that pre-fills (debounced) from the fields its {@link Autofill} declares in `deps`, writing only while
 * the user has not typed their own value (empty, or still the last fill), so a manual edit is never clobbered.
 */
export const AutofillField = ({ autofill, ...fieldProps }: AutofillFieldProps) => {
  const values = useFormValues<AnyProperties>('Form.AutofillField');
  const subset = useMemo(() => pickValues(values, autofill.deps), [values, autofill.deps]);
  const key = useMemo(() => JSON.stringify(subset), [subset]);
  const { data } = useAsyncFieldEffect<string | undefined>(() => autofill.derive(subset), key);

  // Read through refs so the write depends only on the derived value; the accessors change on every edit and would
  // re-fire the effect after its own write.
  const { type } = fieldProps;
  const getValueRef = useRef(fieldProps.getValue);
  getValueRef.current = fieldProps.getValue;
  const onValueChangeRef = useRef(fieldProps.onValueChange);
  onValueChangeRef.current = fieldProps.onValueChange;
  const lastFilledRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const current = getValueRef.current();
    if (typeof data !== 'string' || data.length === 0) {
      // A derivation that stops returning a value clears a fill the user has not edited.
      if (lastFilledRef.current != null && current === lastFilledRef.current) {
        lastFilledRef.current = undefined;
        onValueChangeRef.current(type, '');
      }
      return;
    }
    if (current === data) {
      lastFilledRef.current = data;
      return;
    }
    if (current == null || current === '' || current === lastFilledRef.current) {
      lastFilledRef.current = data;
      onValueChangeRef.current(type, data);
    }
  }, [data, type]);

  return <TextField {...fieldProps} />;
};
