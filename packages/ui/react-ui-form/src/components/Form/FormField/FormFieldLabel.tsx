//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode } from 'react';

import { inputTextLabel, Icon, Input, type ThemedClassName, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FormFieldRendererProps } from '#types';

import { type FormVariant } from '../Form.theme';
import { labelTheme } from './FormFieldLabel.theme';

export type FormFieldLabelProps = ThemedClassName<
  {
    /** Render a plain `<span>` instead of an input-associated `Input.Label`, for labels used outside an `Input.Root` (e.g. section/group headers). */
    standalone?: boolean;
    /** Class applied to the inner label text node, overriding the default size/color (e.g. `text-lg`). */
    labelClassName?: string;
    /** Form variant; selects the label's chrome (e.g. `settings` enlarges the text and places it in the field grid). */
    variant?: FormVariant;
    error?: string;
    /**
     * JSON path of the field this label describes (e.g. `runtime.client.storage.persistent`).
     * Field metadata; accepted by callers but not currently rendered.
     */
    path?: string;
    /**
     * Trailing button rendered at the end of the label row (third grid column).
     * Used by nested-object field sets to surface a collapse toggle.
     */
    button?: ReactNode;
    onClick?: () => void;
  } & Pick<FormFieldRendererProps, 'label' | 'readonly' | 'required'>
>;

export const FormFieldLabel = ({
  classNames,
  labelClassName,
  variant = 'default',
  label,
  error,
  readonly,
  required,
  standalone,
  button,
  onClick,
}: FormFieldLabelProps) => {
  const styles = labelTheme({ variant });
  // Render the required asterisk via a `::after` pseudo-element rather than a DOM node: it keeps the
  // label's `textContent` exactly `label`, so fields stay locatable by their exact label text
  // (`getByLabelText('Name')`), which the DOM-text-based query would otherwise miss as `Name *`.
  // The `text` slot is applied last so a variant/caller size/color (e.g. `text-lg`) wins over the
  // `text-sm`/`text-description` baked into `inputTextLabel`.
  const labelClassNames = mx(
    inputTextLabel,
    required && "after:content-['*'] after:ms-0.5 after:text-warning-text",
    styles.text({ class: labelClassName }),
  );
  // `Input.Label` is a themed primitive that reads `classNames` (and ignores `className`), whereas the
  // plain `span` used for read-only/standalone labels reads `className`.
  const labelNode =
    readonly || standalone ? (
      <span className={labelClassNames}>{label}</span>
    ) : (
      <Input.Label classNames={labelClassNames}>{label}</Input.Label>
    );

  return (
    <div className={styles.root({ class: mx(onClick && 'cursor-pointer', classNames) })} onClick={onClick}>
      {labelNode}
      {error ? (
        <Tooltip.Trigger asChild content={error} side='bottom'>
          <Icon icon='ph--warning--regular' size={4} classNames='text-error-text' />
        </Tooltip.Trigger>
      ) : (
        <span />
      )}
      {button}
    </div>
  );
};

FormFieldLabel.displayName = 'Form.FieldLabel';
