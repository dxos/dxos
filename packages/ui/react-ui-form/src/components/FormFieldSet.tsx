//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren, type ReactNode, useState } from 'react';

import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as Fieldset from '@dxos/react-ui/Fieldset';
import * as SystemButton from '@dxos/react-ui/SystemButton';

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
  const helper = description && <Fieldset.HelperText>{description}</Fieldset.HelperText>;
  const legend = showLabel && (
    <Fieldset.Legend size={nested ? undefined : 'md'} variant={nested ? undefined : 'section'}>
      {label}
      {actions}
      {canCollapse && <SystemButton.Disclosure label={label} expanded={open} onExpandedChange={setOpen} />}
    </Fieldset.Legend>
  );

  if (canCollapse) {
    return (
      <Collapsible.Root asChild open={open} onOpenChange={({ open }) => setOpen(open)}>
        <Fieldset.Root gutter='inherit' inset={nested} data-testid={testId}>
          {legend}
          {helper}
          <Collapsible.Content gutter='inherit'>{children}</Collapsible.Content>
        </Fieldset.Root>
      </Collapsible.Root>
    );
  }

  return (
    <Fieldset.Root gutter='inherit' inset={nested} data-testid={testId}>
      {legend}
      {helper}
      {children}
    </Fieldset.Root>
  );
};

FormFieldSet.displayName = FORM_FIELDSET_NAME;
