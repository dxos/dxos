//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren } from 'react';

import { Collapsible, Fieldset, Icon, type ThemedClassName, composable, composableProps } from '@dxos/react-ui';
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
  }>
>;

/**
 * The one grouping element: a `<fieldset>` named by its legend, with an optional description and
 * disclosure. It binds nothing and walks nothing — a hand-written form nests `Form.Field`s in it, a
 * schema-driven one a `Form.Fields`. Its chrome follows its depth: a top-level field set is a titled
 * section, a nested one an indented, bordered group, so the same element serves both.
 */
export const FormFieldSet = composable<HTMLFieldSetElement, FormFieldSetProps>(
  ({ children, label, description, collapsible, ...props }, forwardedRef) => {
    const { variant = 'default', layout } = useFormContext(FORM_FIELDSET_NAME);
    const depth = useFormFieldSetDepth();
    const styles = formTheme.styles({ variant, depth: depth === 0 ? 'root' : 'nested' });
    const showLabel = layout !== 'inline' && !!label;
    // An empty group has nothing to fold, so a disclosure on its legend would be a control that does nothing.
    const canCollapse = !!collapsible && Children.toArray(children).length > 0;

    const legend = showLabel && (
      <Fieldset.Legend classNames={styles.fieldSetLegend({ class: description ? undefined : styles.fieldSetHeader() })}>
        {canCollapse ? (
          <FormFieldHeader
            label={label}
            trigger
            actions={
              <Icon
                icon='ph--caret-right--regular'
                size={4}
                classNames='mx-1.5 transition-transform group-data-[state=open]:rotate-90'
              />
            }
          />
        ) : depth === 0 ? (
          // A heading inside the legend: the group is named by its title, and the title still serves navigation.
          <h2 className={styles.fieldSetTitle()}>{label}</h2>
        ) : (
          <FormFieldHeader label={label} />
        )}
      </Fieldset.Legend>
    );

    const helper = description && (
      <Fieldset.HelperText asChild classNames={styles.fieldSetHeader({ class: styles.fieldSetDescription() })}>
        <MarkdownView content={description} />
      </Fieldset.HelperText>
    );

    const body = (
      <FormFieldSetDepthContext.Provider value={depth + 1}>
        {canCollapse ? (
          <Collapsible.Content classNames={styles.fieldSetBody()}>{children}</Collapsible.Content>
        ) : (
          children
        )}
      </FormFieldSetDepthContext.Provider>
    );

    const fieldset = (
      <Fieldset.Root {...composableProps(props, { classNames: styles.fieldSet() })} ref={forwardedRef}>
        {legend}
        {helper}
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
