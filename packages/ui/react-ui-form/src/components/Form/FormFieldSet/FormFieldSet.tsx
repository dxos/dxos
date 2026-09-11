//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren, useId } from 'react';

import {
  Collapsible,
  Field,
  Fieldset,
  Icon,
  type ThemedClassName,
  Tooltip,
  composable,
  composableProps,
} from '@dxos/react-ui';
import { MarkdownView } from '@dxos/react-ui-markdown';
import { mx } from '@dxos/ui-theme';

import { useFormContext } from '../../../hooks/index.ts';
import { formTheme } from '../Form.theme';
import { FormFieldHeader } from '../FormField/index.ts';
import { FormFieldSetDepthContext, useFormFieldSetDepth } from './FormFieldSetContext.ts';

const FORM_FIELDSET_NAME = 'Form.FieldSet';

export type FormFieldSetProps = ThemedClassName<
  PropsWithChildren<{
    label?: string;
    /** Markdown, rendered under the legend, or as a tooltip on the label. */
    description?: string;
    /** Where the description shows: as helper text below the legend (default), or on hover of the label. */
    descriptionPlacement?: 'below' | 'tooltip';
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
  ({ children, label, description, descriptionPlacement = 'below', collapsible, ...props }, forwardedRef) => {
    const { variant = 'default', layout } = useFormContext(FORM_FIELDSET_NAME);
    const depth = useFormFieldSetDepth();
    const labelId = useId();
    const styles = formTheme.styles({ variant, depth: depth === 0 ? 'root' : 'nested' });
    const showLabel = layout !== 'inline' && !!label;
    // An empty group has nothing to fold, so a disclosure on its legend would be a control that does nothing.
    const canCollapse = !!collapsible && Children.toArray(children).length > 0;

    const tooltip = descriptionPlacement === 'tooltip' && !!description;
    // A question mark after the label carries the description, so the group's chrome stays one line.
    const hint = tooltip && (
      <Tooltip.Trigger
        content={description}
        side='bottom'
        aria-label={description}
        className='grid size-6 place-items-center rounded-xs text-description hover:bg-hover-surface'
      >
        <Icon icon='ph--question--regular' size={4} />
      </Tooltip.Trigger>
    );

    const legend = showLabel && (
      <Fieldset.Legend
        classNames={styles.fieldSetLegend({
          class: mx(description && !tooltip ? undefined : styles.fieldSetHeader(), hint && 'flex items-center gap-1'),
        })}
      >
        {canCollapse ? (
          // The caret alone is the disclosure, named by the label text beside it, so the focus ring
          // frames a button and not the whole row.
          <FormFieldHeader
            label={label}
            labelId={labelId}
            labelEnd={hint}
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
          <>
            <h2 id={labelId} className={styles.fieldSetTitle()}>
              {label}
            </h2>
            {hint}
          </>
        ) : (
          <FormFieldHeader label={label} labelId={labelId} labelEnd={hint} />
        )}
      </Fieldset.Legend>
    );

    const helper = description && !tooltip && (
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
