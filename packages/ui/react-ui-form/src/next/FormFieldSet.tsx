//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren, type ReactNode } from 'react';

import { Next } from '@dxos/react-ui/next';

import { useFormContext } from '../hooks/index.ts';

const FORM_FIELDSET_NAME = 'Form.FieldSet';

export type FormFieldSetProps = PropsWithChildren<{
  label?: string;
  /** Plain text under the legend (the current FieldSet renders markdown; see SPIKE.md). */
  description?: string;
  /** The legend is a disclosure that folds the body. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Controls acting on the group, at the end of its legend row. */
  actions?: ReactNode;
  /** A nested object's group: one surface rung above its host. Set by the dispatcher, never read from context. */
  nested?: boolean;
  'data-testid'?: string;
}>;

/**
 * A `<fieldset>` that is a subgrid of the enclosing grid (`gutter='inherit'`), so fields at any depth keep the form's
 * rails and tracks; a collapsible set folds a Collapsible Content that is itself a subgrid.
 */
export const FormFieldSet = ({
  children,
  label,
  description,
  collapsible,
  defaultOpen = true,
  actions,
  nested,
  'data-testid': testId,
}: FormFieldSetProps) => {
  const { layout } = useFormContext(FORM_FIELDSET_NAME);
  const showLabel = layout !== 'inline' && !!label;
  const canCollapse = !!collapsible && showLabel && Children.toArray(children).length > 0;
  const level = nested ? '+1' : undefined;
  const helper = description && <Next.Fieldset.HelperText>{description}</Next.Fieldset.HelperText>;

  if (canCollapse) {
    return (
      <Next.Collapsible.Root asChild defaultOpen={defaultOpen}>
        <Next.Fieldset.Root gutter='inherit' level={level} data-testid={testId}>
          <Next.Fieldset.Legend size={nested ? 'sm' : 'md'}>
            <Next.Collapsible.Trigger>{label}</Next.Collapsible.Trigger>
            {actions}
          </Next.Fieldset.Legend>
          {helper}
          <Next.Collapsible.Content gutter='inherit'>{children}</Next.Collapsible.Content>
        </Next.Fieldset.Root>
      </Next.Collapsible.Root>
    );
  }

  return (
    <Next.Fieldset.Root gutter='inherit' level={level} data-testid={testId}>
      {showLabel && (
        <Next.Fieldset.Legend size={nested ? 'sm' : 'md'}>
          {label}
          {actions}
        </Next.Fieldset.Legend>
      )}
      {helper}
      {children}
    </Next.Fieldset.Root>
  );
};

FormFieldSet.displayName = FORM_FIELDSET_NAME;
