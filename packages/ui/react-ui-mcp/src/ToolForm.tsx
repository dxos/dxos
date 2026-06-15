//
// Copyright 2026 DXOS.org
//

// Renders an Effect Schema input (e.g. one of the `*Input` structs from
// `@dxos/introspect-mcp/tools`) as an editable form using
// `@dxos/react-ui-form`'s `Form.Root`. Thin wrapper — the form work happens
// in react-ui-form; this component glues it to the MCP tool spec shape.

import * as Schema from 'effect/Schema';
import React, { type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

export type ToolFormProps<S extends Schema.Schema.AnyNoContext> = ThemedClassName<{
  /** Effect Schema struct describing the tool's input. */
  schema: S;
  /** Initial form values (passes through as `defaultValues` to react-ui-form). */
  defaultValues?: Partial<Schema.Schema.Type<S>>;
  /** Called when the form is submitted and passes validation. */
  onSave?: (values: Schema.Schema.Type<S>) => void;
}>;

/**
 * Default tool form: schema-driven fields + a submit action. For more
 * elaborate layouts, drop down to `Form.Root` from `@dxos/react-ui-form`
 * directly — this component is the convenience wrapper for the common case.
 *
 * Prop name `onSave` matches react-ui-form's terminology — submitting the
 * form fires onSave with the validated values.
 */
export const ToolForm = <S extends Schema.Schema.AnyNoContext>({
  classNames,
  schema,
  defaultValues,
  onSave,
}: ToolFormProps<S>): ReactNode => (
  <div className={mx('flex flex-col gap-2', classNames)}>
    <Form.Root schema={schema} defaultValues={defaultValues as any} onSave={onSave as any}>
      <Form.Viewport>
        <Form.Content />
      </Form.Viewport>
      <Form.Actions />
    </Form.Root>
  </div>
);
