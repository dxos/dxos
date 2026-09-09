//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren, useId } from 'react';

import { Collapsible, Field, Fieldset, Icon, type ThemedClassName, composable, composableProps } from '@dxos/react-ui';
import { MarkdownView } from '@dxos/react-ui-markdown';

import { useFormContext } from '../../../hooks';
import { formTheme } from '../Form.theme';
import { FormFieldHeader } from '../FormField';
import { FormFieldSetDepthContext, useFormFieldSetDepth } from './FormFieldSetContext';

const FORM_FIELDSET_NAME = 'Form.FieldSet';

export type FormFieldSetProps = ThemedClassName<
  PropsWithChildren<{
    label?: string;
    /** Markdown, rendered under the legend. */
    description?: string;
    /** The legend is a disclosure that folds the body; nested objects fold by default. */
    collapsible?: boolean;
    /** Controls acting on the group as a whole, rendered at the end of its heading row. */
    actions?: React.ReactNode;
  }>
>;

/**
 * The one grouping element: a `<fieldset>` named by its legend, with an optional description and
 * disclosure. It binds nothing and walks nothing — a hand-written form nests `Form.Field`s in it, a
 * schema-driven one a `Form.Fields`. Its chrome follows its depth: a top-level field set is a titled
 * section, a nested one an indented, bordered group, so the same element serves both.
 */
export const FormFieldSet = composable<HTMLFieldSetElement, FormFieldSetProps>(
  ({ children, label, description, collapsible, actions, ...props }, forwardedRef) => {
    const { variant = 'default', layout } = useFormContext(FORM_FIELDSET_NAME);
    const depth = useFormFieldSetDepth();
    const labelId = useId();
    const styles = formTheme.styles({ variant, depth: depth === 0 ? 'root' : 'nested' });
    const showLabel = layout !== 'inline' && !!label;
    // An empty group has nothing to fold, so a disclosure on its legend would be a control that does nothing.
    const canCollapse = !!collapsible && Children.toArray(children).length > 0;

    const legend = showLabel && (
      <Fieldset.Legend classNames={styles.fieldSetLegend({ class: description ? undefined : styles.fieldSetHeader() })}>
        {canCollapse ? (
          // The caret alone is the disclosure, named by the label text beside it, so the focus ring
          // frames a button and not the whole row.
          <FormFieldHeader
            label={label}
            labelId={labelId}
            actions={
              <Field.Block>
                {/* Not a `Button`: its open-state styling would read the trigger's `data-state`. */}
                <Collapsible.Trigger
                  aria-labelledby={labelId}
                  classNames='group grid size-6 place-items-center rounded-xs hover:bg-hover-surface'
                >
                  <Icon
                    icon='ph--caret-right--regular'
                    size={3}
                    classNames='transition-transform group-data-[state=open]:rotate-90'
                  />
                </Collapsible.Trigger>
              </Field.Block>
            }
          />
        ) : depth === 0 ? (
          // A heading inside the legend: the group is named by its title, and the title still serves navigation.
          <h2 id={labelId} className={styles.fieldSetTitle()}>
            {label}
          </h2>
        ) : (
          <FormFieldHeader label={label} labelId={labelId} />
        )}
      </Fieldset.Legend>
    );

    const helper = description && (
      <Fieldset.HelperText asChild classNames={styles.fieldSetHeader({ class: styles.fieldSetDescription() })}>
        <MarkdownView content={description} />
      </Fieldset.HelperText>
    );

    // A nested group's body is the bordered box, under the legend; the root's fields sit in the fieldset itself.
    const body = (
      <FormFieldSetDepthContext.Provider value={depth + 1}>
        {canCollapse ? (
          <Collapsible.Content classNames={styles.fieldSetBody()}>{children}</Collapsible.Content>
        ) : depth > 0 ? (
          <div className={styles.fieldSetBody()}>{children}</div>
        ) : (
          children
        )}
      </FormFieldSetDepthContext.Provider>
    );

    const fieldset = (
      <Fieldset.Root
        {...composableProps(props, { classNames: styles.fieldSet() })}
        aria-labelledby={showLabel ? labelId : undefined}
        ref={forwardedRef}
      >
        {legend}
        {helper}
        {actions && <div className={styles.fieldSetActions()}>{actions}</div>}
        {body}
      </Fieldset.Root>
    );

    // The box is the fieldset and the `Collapsible` at once, so the group's name, border and
    // disclosure state sit on one element.
    return canCollapse ? (
      <Collapsible.Root defaultOpen asChild>
        {fieldset}
      </Collapsible.Root>
    ) : (
      fieldset
    );
  },
);

FormFieldSet.displayName = FORM_FIELDSET_NAME;
