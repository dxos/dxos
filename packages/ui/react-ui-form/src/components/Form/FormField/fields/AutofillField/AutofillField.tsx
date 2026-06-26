//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type Annotation } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';

import { type FormFieldRendererProps } from '#types';

import { pickValues, useAsyncFieldEffect, useFormValues } from '../../../../../hooks';
import { TextField } from '../TextField';

export type AutofillFieldProps = FormFieldRendererProps<string> & {
  /** Derives this field's value from the autofill's declared dependency fields (e.g. a sibling URL). */
  autofill: Annotation.Autofill;
};

/**
 * An editable text field that pre-fills its value (debounced) from the fields the autofill declares in
 * its `deps`, via an {@link Annotation.Autofill}. Re-runs only when one of those values changes. The
 * derived value is written only while the user has not typed their own (the field is empty or still
 * holds the last auto-filled value), so a manual edit is never clobbered.
 */
export const AutofillField = ({ autofill, ...fieldProps }: AutofillFieldProps) => {
  const values = useFormValues<AnyProperties>(AutofillField.displayName);
  const subset = useMemo(() => pickValues(values, autofill.deps), [values, autofill.deps]);
  const key = useMemo(() => JSON.stringify(subset), [subset]);
  const { data } = useAsyncFieldEffect<string | undefined>(() => autofill.derive(subset), key);

  // Read field state through refs so the write effect depends only on the derived `data` — `getValue`
  // and `onValueChange` change identity on every value edit, and depending on them would re-fire the
  // effect after it writes, re-applying the same value in an infinite loop.
  const { type } = fieldProps;
  const getValueRef = useRef(fieldProps.getValue);
  getValueRef.current = fieldProps.getValue;
  const onValueChangeRef = useRef(fieldProps.onValueChange);
  onValueChangeRef.current = fieldProps.onValueChange;
  const lastFilledRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typeof data !== 'string' || data.length === 0) {
      return;
    }
    const current = getValueRef.current();
    if (current === data) {
      lastFilledRef.current = data;
      return;
    }
    // Only fill while the user has not typed their own value (empty, or still our last fill).
    if (current == null || current === '' || current === lastFilledRef.current) {
      lastFilledRef.current = data;
      onValueChangeRef.current(type, data);
    }
  }, [data, type]);

  return <TextField {...fieldProps} />;
};

AutofillField.displayName = 'Form.AutofillField';
