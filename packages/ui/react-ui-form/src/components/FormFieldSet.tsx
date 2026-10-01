//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren, type ReactNode, useState } from 'react';

import { Next } from '@dxos/react-ui/next';

import { useFormContext } from '../hooks/index.ts';

const FORM_FIELDSET_NAME = 'Form.FieldSet';

export type FormFieldSetProps = PropsWithChildren<{
  'label'?: string;
  /** Plain text under the legend (the current FieldSet renders markdown; see SPIKE.md). */
  'description'?: string;
  /** The legend ends with a disclosure button that folds the body. */
  'collapsible'?: boolean;
  'defaultOpen'?: boolean;
  /** Controls acting on the group, at the end of its legend row. */
  'actions'?: ReactNode;
  /** A nested object's group: bordered and indented. Set by the dispatcher, never read from context. */
  'nested'?: boolean;
  'data-testid'?: string;
}>;

/**
 * A grid `Fieldset` (`gutter='inherit'`): a `group` named by its legend that is a subgrid of the enclosing grid, so
 * fields keep the form's columns at any depth. A nested object's set is `inset` (bordered and indented on its host's
 * surface, never a surface step); a collapsible set ends its legend with a disclosure button and folds a Collapsible
 * Content that is itself a subgrid.
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
  const [open, setOpen] = useState(defaultOpen);
  const showLabel = layout !== 'inline' && !!label;
  const canCollapse = !!collapsible && showLabel && Children.toArray(children).length > 0;
  const helper = description && <Next.Fieldset.HelperText>{description}</Next.Fieldset.HelperText>;
  const legend = showLabel && (
    <Next.Fieldset.Legend size={nested ? undefined : 'md'}>
      {label}
      {actions}
      {canCollapse && <Next.SystemButton.Disclosure label={label} expanded={open} onExpandedChange={setOpen} />}
    </Next.Fieldset.Legend>
  );

  if (canCollapse) {
    return (
      <Next.Collapsible.Root asChild open={open} onOpenChange={({ open }) => setOpen(open)}>
        <Next.Fieldset.Root gutter='inherit' inset={nested} data-testid={testId}>
          {legend}
          {helper}
          <Next.Collapsible.Content gutter='inherit'>{children}</Next.Collapsible.Content>
        </Next.Fieldset.Root>
      </Next.Collapsible.Root>
    );
  }

  return (
    <Next.Fieldset.Root gutter='inherit' inset={nested} data-testid={testId}>
      {legend}
      {helper}
      {children}
    </Next.Fieldset.Root>
  );
};

FormFieldSet.displayName = FORM_FIELDSET_NAME;
