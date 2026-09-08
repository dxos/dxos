//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren } from 'react';

import { Collapsible, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useFormContext } from '../../../hooks';
import { formTheme } from '../Form.theme';
import { FormFieldHeader, type FormFieldPresentation } from '../FormField';

const FORM_FIELDSET_CONTAINER_NAME = 'Form.FieldSetContainer';

export type FormFieldSetContainerProps = ThemedClassName<
  PropsWithChildren<{
    label?: string;
    /** JSON path of the group, forwarded to the label as field metadata. */
    path?: string;
    readonly?: boolean;
    presentation: FormFieldPresentation;
    /**
     * Make the header a disclosure for the body and wrap both in an indented, bordered box.
     * Used for nested objects (struct fields, object-array items, inline refs).
     */
    collapsible?: boolean;
  }>
>;

/**
 * Shared chrome for a labelled group of sub-fields: an optional header and, when collapsible, an
 * indented bordered container that is a `Collapsible` with the header as its trigger. Each nested
 * object folds on its own — the form owns no set across siblings, so there is nothing for an accordion
 * to coordinate. Nested structs, object-array items, and inline refs all reach this via `FormFieldSet`,
 * so their visual containment is identical.
 */
export const FormFieldSetContainer = ({
  classNames,
  label,
  path,
  readonly,
  presentation,
  collapsible,
  children,
}: FormFieldSetContainerProps) => {
  // Resolved per render, not once at module scope: a module-scope `formTheme.styles()` silently pins
  // the `default` variant, so a `settings` form's nested groups lost the gap between their sub-fields
  // and rendered flush. Every path here passes through `Form.FieldSet`, which reads the same context.
  const { variant = 'default' } = useFormContext(FORM_FIELDSET_CONTAINER_NAME);
  const styles = formTheme.styles({ variant });
  // An empty object/array renders no sub-fields, so there is nothing to fold — a disclosure on the
  // header would be a control that does nothing.
  const canCollapse = collapsible && Children.toArray(children).length > 0;

  // Nested groups fold inside an indented, bordered container: the box is the `Collapsible`, its header
  // the trigger and its body the content, so the disclosure adds no element of its own.
  if (canCollapse) {
    return (
      <div className={styles.fieldSetBoxOuter()}>
        <Collapsible.Root defaultOpen classNames={styles.fieldSetBox({ class: mx(classNames) })}>
          {presentation.showLabel && label && (
            <FormFieldHeader
              label={label}
              path={path}
              readonly={readonly}
              classNames='pl-2'
              trigger
              actions={
                <Icon
                  icon='ph--caret-right--regular'
                  size={4}
                  classNames='mx-1.5 transition-transform group-data-[state=open]:rotate-90'
                />
              }
            />
          )}
          <Collapsible.Content classNames={styles.fieldSetBody()}>{children}</Collapsible.Content>
        </Collapsible.Root>
      </div>
    );
  }

  const content = (
    <>
      {presentation.showLabel && label && (
        <FormFieldHeader label={label} path={path} readonly={readonly} classNames='pl-2' />
      )}
      {children}
    </>
  );

  // A non-collapsible group only materializes a wrapper when `classNames` is supplied — otherwise the
  // body flows straight into the parent grid (the default, grid-transparent behavior).
  return classNames ? <div className={mx(classNames)}>{content}</div> : <>{content}</>;
};
