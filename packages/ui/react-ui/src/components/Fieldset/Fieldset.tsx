//
// Copyright 2026 DXOS.org
//

// `Fieldset` — a group of fields on Ark's fieldset: a `<fieldset>` whose `disabled` reaches every
// field inside it (the field machine reads the fieldset's), named by its legend and described by
// its helper and error text through `aria-labelledby`/`aria-describedby`, which the machine wires by
// detecting the texts' presence. DXOS owns the type and the box.

import { Fieldset as FieldsetPrimitive } from '@ark-ui/react/fieldset';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName, composable, composableProps } from '../../util';

//
// Root
//

const ROOT_NAME = 'Fieldset.Root';

type FieldsetRootProps = ThemedClassName<ComponentPropsWithRef<typeof FieldsetPrimitive.Root>>;

const FieldsetRoot = composable<HTMLFieldSetElement, FieldsetRootProps>(({ children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  return (
    <FieldsetPrimitive.Root {...rest} className={tx('fieldset.root', {}, className)} ref={forwardedRef}>
      {children}
    </FieldsetPrimitive.Root>
  );
});

FieldsetRoot.displayName = ROOT_NAME;

//
// Legend
//

type FieldsetLegendProps = ThemedClassName<ComponentPropsWithRef<typeof FieldsetPrimitive.Legend>>;

/** Names the group. With `asChild` a heading can be the legend, so the group is named by its title. */
const FieldsetLegend = forwardRef<HTMLLegendElement, FieldsetLegendProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <FieldsetPrimitive.Legend {...props} className={tx('fieldset.legend', {}, classNames)} ref={forwardedRef}>
        {children}
      </FieldsetPrimitive.Legend>
    );
  },
);

FieldsetLegend.displayName = 'Fieldset.Legend';

//
// HelperText, ErrorText
//

type FieldsetHelperTextProps = ThemedClassName<ComponentPropsWithRef<typeof FieldsetPrimitive.HelperText>>;

const FieldsetHelperText = forwardRef<HTMLSpanElement, FieldsetHelperTextProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <FieldsetPrimitive.HelperText {...props} className={tx('fieldset.helperText', {}, classNames)} ref={forwardedRef}>
        {children}
      </FieldsetPrimitive.HelperText>
    );
  },
);

FieldsetHelperText.displayName = 'Fieldset.HelperText';

type FieldsetErrorTextProps = ThemedClassName<ComponentPropsWithRef<typeof FieldsetPrimitive.ErrorText>>;

/** Rendered only while the group is `invalid`, and announced when it appears. */
const FieldsetErrorText = forwardRef<HTMLSpanElement, FieldsetErrorTextProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <FieldsetPrimitive.ErrorText {...props} className={tx('fieldset.errorText', {}, classNames)} ref={forwardedRef}>
        {children}
      </FieldsetPrimitive.ErrorText>
    );
  },
);

FieldsetErrorText.displayName = 'Fieldset.ErrorText';

//
// Fieldset
//

export const Fieldset = {
  Root: FieldsetRoot,
  Legend: FieldsetLegend,
  HelperText: FieldsetHelperText,
  ErrorText: FieldsetErrorText,
};

export type { FieldsetErrorTextProps, FieldsetHelperTextProps, FieldsetLegendProps, FieldsetRootProps };
