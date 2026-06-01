//
// Copyright 2024 DXOS.org
//

import { format as formatDate } from 'date-fns';
import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import React, {
  Component,
  type FC,
  type FocusEvent,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';

import { type Database, Format } from '@dxos/echo';
import { Icon, Input, Tooltip } from '@dxos/react-ui';
import { inputTextLabel } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FormFieldStatus } from '../../hooks';
import { useFormTooltips } from './FormTooltipsContext';

/**
 * Dynamic props passed to input components.
 */
export type FormFieldStateProps<T = any> = {
  getStatus: () => FormFieldStatus;
  getValue: () => T | undefined;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onValueChange: (type: SchemaAST.AST, value: T) => void;
};

/**
 * Presentation mode.
 * - full: Show label, control, and status.
 * - compact: Show label and control.
 * - inline: Control only.
 * - static: Plain DOM; omit all undefined values.
 */
// TODO(burdon): 'inline' should be orthogonal to the layout (e.g., array of inline static).
export type Presentation = 'full' | 'compact' | 'inline' | 'static';

/**
 * Props passed to input components.
 */
export type FormFieldComponentProps<T = any> = {
  /** Database the form is editing against; populated for fields whose value is an ECHO object/Ref. */
  db?: Database.Database;
  type: SchemaAST.AST;
  format?: Format.TypeFormat;
  readonly?: boolean;
  label: string;
  /**
   * Dotted JSON path of this field within the form values (e.g.
   * `runtime.client.storage.persistent`). Forwarded to `FormFieldLabel` so
   * that it can render the path as a debug hint when the enclosing
   * `Form.Root` has `debug` enabled.
   */
  jsonPath?: string;
  placeholder?: string;
  autoFocus?: boolean;
  layout?: Presentation;
} & FormFieldStateProps<T>;

export type FormFieldComponent = FC<FormFieldComponentProps>;

export type FormFieldMap = Record<string, FormFieldComponent>;

export type FormFieldProvider = (props: {
  prop: string;
  schema: Schema.Schema<any>;
  fieldProps: FormFieldComponentProps;
}) => ReactElement | null | undefined;

//
// FormFieldLabel
//

export type FormFieldLabelProps = {
  asChild?: boolean;
  error?: string;
  /**
   * JSON path of the field this label describes (e.g. `runtime.client.storage.persistent`).
   * Surfaced as a hover tooltip on the label when the enclosing `Form.Root`
   * has `tooltips` enabled (the default) -- useful for spotting which field
   * maps to which path when authoring schemas or filing bugs against a form.
   * Callers can supply the path unconditionally; the label suppresses the
   * tooltip when `Form.Root tooltips={false}`.
   */
  path?: string;
} & Pick<FormFieldComponentProps, 'label' | 'readonly'>;

export const FormFieldLabel = ({ label, error, readonly, asChild, path }: FormFieldLabelProps) => {
  const tooltips = useFormTooltips();
  const Label = readonly || asChild ? 'span' : Input.Label;
  const labelNode = <Label className={mx(inputTextLabel, 'text-sm')}>{label}</Label>;
  return (
    <div className='flex items-center justify-between'>
      {tooltips && path ? (
        <Tooltip.Trigger asChild content={path} side='bottom'>
          {labelNode}
        </Tooltip.Trigger>
      ) : (
        labelNode
      )}
      {error && (
        <Tooltip.Trigger asChild content={error} side='bottom'>
          <Icon icon='ph--warning--regular' size={4} classNames='text-error-text' />
        </Tooltip.Trigger>
      )}
    </div>
  );
};

FormFieldLabel.displayName = 'Form.FieldLabel';

//
// FormFieldWrapper
//

export type FormFieldWrapperProps<T = any> = Pick<
  FormFieldComponentProps,
  'readonly' | 'label' | 'layout' | 'getStatus' | 'getValue' | 'jsonPath' | 'format'
> & {
  children?: (props: { value: T }) => ReactNode;
};

/**
 * Formats a value for `static` (read-only, plain-DOM) presentation based on its
 * type `format`. Dates/times are rendered human-readable; everything else falls
 * back to `String(value)`.
 */
const formatStaticValue = (value: unknown, format?: Format.TypeFormat): string => {
  if (value == null) {
    return '';
  }

  switch (format) {
    case Format.TypeFormat.DateTime:
    case Format.TypeFormat.Date:
    case Format.TypeFormat.Time: {
      const date = new Date(value as string);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }
      const pattern = format === Format.TypeFormat.DateTime ? 'PPp' : format === Format.TypeFormat.Date ? 'PP' : 'p';
      return formatDate(date, pattern);
    }
    default:
      return String(value);
  }
};

export const FormFieldWrapper = <T,>(props: FormFieldWrapperProps<T>) => {
  const { children, readonly, layout, label, jsonPath, format, getStatus, getValue } = props;
  const { status, error } = getStatus();

  const value = getValue();
  if (layout === 'static' && value == null) {
    return null;
  }

  const str = formatStaticValue(value, format);

  return (
    <div className='contents'>
      <Input.Root validationValence={status}>
        {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} path={jsonPath} />}
        {layout === 'static' ? (
          <p className='truncate min-w-0' title={str}>
            {str}
          </p>
        ) : children ? (
          children({ value })
        ) : null}
        {layout === 'full' && error && (
          <Input.DescriptionAndValidation>
            <Input.Validation>{error}</Input.Validation>
          </Input.DescriptionAndValidation>
        )}
      </Input.Root>
    </div>
  );
};

//
// FormFieldErrorBoundary
//

type FormFieldErrorState = {
  error: Error | undefined;
};

type FormFieldErrorBoundaryProps = PropsWithChildren<{
  path?: (string | number)[];
}>;

export class FormFieldErrorBoundary extends Component<FormFieldErrorBoundaryProps, FormFieldErrorState> {
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override state = { error: undefined };

  override componentDidUpdate(prevProps: FormFieldErrorBoundaryProps) {
    if (prevProps.path !== this.props.path) {
      this.resetError();
    }
  }

  override render() {
    if (this.state.error) {
      return (
        <div className='flex gap-2 border border-rose-fill font-mono text-sm'>
          <span className='bg-rose-fill text-base-foreground px-1 font-thin'>ERROR</span>
          {String(this.props.path?.join('.'))}
        </div>
      );
    }

    return this.props.children;
  }

  private resetError() {
    this.setState({ error: undefined });
  }
}
