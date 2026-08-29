//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The React renderer: one function per kind tag, mapped onto the simplest existing
// `react-ui` / `react-ui-list` / `react-ui-form` components.
//
// Constructed by a factory rather than exported as a constant: `form` resolves its schema against
// the registry, so the renderer closes over it. The model and the walk stay framework-free; this
// file is where React begins.
//

import type * as Schema from 'effect/Schema';
import React, { type ReactNode } from 'react';

import { type Align, Button, Flex, type Gap, Grid, Input, type Justify, Panel } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Combobox, Listbox } from '@dxos/react-ui-list';

import { type Binding, type Node, type Scope, resolve } from '../model';
import { type Renderer, type RenderOptions, render } from '../render';

const asText = (value: unknown): string => (value == null ? '' : String(value));

const GAPS: readonly Gap[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'form', 'form-section'];
const ALIGNS: readonly Align[] = ['start', 'center', 'end', 'baseline', 'stretch'];
const JUSTIFIES: readonly Justify[] = ['start', 'center', 'end', 'between', 'around', 'evenly'];

const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  values.find((candidate) => candidate === value);

/**
 * `gap`/`align`/`justify` come off the node's static props and are handed to `Flex` unchanged —
 * the aspect vocabulary in the template is the same closed set the primitive already takes.
 * `gap` defaults to the ramp's `sm`: a minimal template says nothing and gets sane spacing.
 */
const flexProps = (props: Readonly<Record<string, string | number | boolean>>) => ({
  column: props.direction === 'column',
  gap: oneOf(GAPS, props.gap) ?? 'sm',
  align: oneOf(ALIGNS, props.align),
  justify: oneOf(JUSTIFIES, props.justify),
});

/** A `columns`/`rows` aspect: whitespace-separated CSS tracks, bare numbers read as `<n>fr`. */
const tracks = (value: string | number | boolean | undefined): (string | number)[] | undefined =>
  typeof value === 'string' && value.trim()
    ? value
        .trim()
        .split(/\s+/)
        .map((track) => (/^\d+$/.test(track) ? Number(track) : track))
    : undefined;

/** Resolve a per-item binding (`item-id`, `item-label`) declared on the collection node itself. */
const itemField = (node: Node, scope: Scope, item: unknown, name: string): unknown => {
  const binding: Binding | undefined = node.data?.[name];
  return binding ? resolve(binding, { ...scope, item }) : undefined;
};

export type ReactRendererOptions = {
  /** The registry's schemas by URI key; `form` resolves `schema=` against this. */
  schemas: Readonly<Record<string, Schema.Codec<any, any>>>;
};

export const createReactRenderer = ({ schemas }: ReactRendererOptions): Renderer<ReactNode> => ({
  container: ({ path, props, children }) => (
    <Panel.Root key={path}>
      <Panel.Content>
        <Flex column gap={oneOf(GAPS, props.gap) ?? 'sm'}>
          {children}
        </Flex>
      </Panel.Content>
    </Panel.Root>
  ),

  /**
   * `columns`/`rows` turn the layout into a grid with explicit tracks — geometry lives in the
   * template, not in renderer workarounds. Without them it is a flex row/column.
   */
  layout: ({ path, props, children }) => {
    const cols = tracks(props.columns);
    const rows = tracks(props.rows);
    if (cols || rows) {
      return (
        <Grid key={path} cols={cols} rows={rows} gap={oneOf(GAPS, props.gap) ?? 'sm'} grow={false}>
          {children}
        </Grid>
      );
    }
    return (
      <Flex key={path} {...flexProps(props)} classNames='min-w-0'>
        {children}
      </Flex>
    );
  },

  display: ({ path, props, data }) => (
    <span key={path} className={props.variant === 'title' ? 'text-lg font-medium' : 'text-description'}>
      {asText(data.text)}
    </span>
  ),

  control: ({ path, props, data, handlers }) => {
    if (props.as === 'button') {
      return (
        <Button key={path} onClick={() => handlers.activate?.()}>
          {asText(props.label)}
        </Button>
      );
    }
    return (
      <Input.Root key={path}>
        <Flex column>
          {props.label ? <Input.Label>{asText(props.label)}</Input.Label> : null}
          <Input.TextInput
            placeholder={asText(props.placeholder)}
            value={asText(data.value)}
            // MVU: the input is controlled from published state; each change dispatches.
            onChange={(event) => handlers.input?.(event.target.value)}
          />
        </Flex>
      </Input.Root>
    );
  },

  /**
   * With a `select` event: a Listbox whose selection is published state (`data-selection` reads it
   * back, clicking dispatches). Without one: a plain read-only list. Item identity and label come
   * from the collection's own `item-id` / `item-label` bindings.
   */
  collection: ({ path, node, data, handlers, scope, renderChildren }) => {
    const items = Array.isArray(data.items) ? data.items : [];
    if (node.events?.select) {
      return (
        <Listbox.Root
          key={path}
          value={asText(data.selection) || undefined}
          onValueChange={(next) => handlers.select?.(next)}
        >
          <Listbox.Viewport>
            <Listbox.Content>
              {items.map((item, index) => {
                const id = asText(itemField(node, scope, item, 'id') ?? index);
                return (
                  <Listbox.Item key={id} id={id}>
                    <Listbox.ItemLabel>{asText(itemField(node, scope, item, 'label') ?? id)}</Listbox.ItemLabel>
                    <Listbox.Indicator />
                  </Listbox.Item>
                );
              })}
            </Listbox.Content>
          </Listbox.Viewport>
        </Listbox.Root>
      );
    }

    return (
      <Flex key={path} column gap='xs' role='list'>
        {items.map((item, index) => (
          <Flex key={asText(itemField(node, scope, item, 'id') ?? index)} role='listitem' gap='sm' align='center'>
            {node.children?.length
              ? renderChildren({ ...scope, item }, `[${index}]`)
              : asText(itemField(node, scope, item, 'label') ?? item)}
          </Flex>
        ))}
      </Flex>
    );
  },

  /**
   * Schema-driven editor over the bound object. The draft is the form's own private state — the
   * system deliberately does not see keystrokes; `save` surfaces the whole edit as one operation
   * (payload = validated values), `cancel` discards it. Keyed by the bound object's identity so a
   * changed master selection remounts a fresh draft.
   */
  form: ({ path, props, node, data, handlers }) => {
    const schemaKey = asText(props.schema);
    const schema = schemas[schemaKey];
    if (!schema) {
      return (
        <span key={path} className='text-error-text text-sm'>
          unknown schema '{schemaKey}'
        </span>
      );
    }
    const values = data.values && typeof data.values === 'object' ? (data.values as Record<string, unknown>) : {};
    const identity = asText(values.id ?? path);
    return (
      <Form.Root
        key={`${path}:${identity}`}
        schema={schema}
        defaultValues={values}
        onSave={(next) => handlers.save?.(next)}
        onCancel={() => handlers.cancel?.()}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
            {(node.events?.save || node.events?.cancel) && <Form.Actions />}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  },

  /**
   * Filtering combobox. The input text and committed value are both published state: typing
   * dispatches `input`, choosing dispatches `select`, and the *caller* derives the filtered items
   * from state — the component filters nothing, so MVU holds.
   */
  combobox: ({ path, node, props, data, handlers, scope }) => {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <Combobox.Root
        key={path}
        placeholder={asText(props.placeholder) || undefined}
        value={asText(data.value)}
        onValueChange={(next) => handlers.select?.(next)}
      >
        <Combobox.Trigger />
        <Combobox.Content>
          <Combobox.Input
            placeholder={asText(props.placeholder) || undefined}
            value={asText(data.filter)}
            onValueChange={(next) => handlers.input?.(next)}
          />
          <Combobox.List>
            {items.map((item, index) => {
              const id = asText(itemField(node, scope, item, 'id') ?? index);
              return <Combobox.Item key={id} value={id} label={asText(itemField(node, scope, item, 'label') ?? id)} />;
            })}
            {items.length === 0 && <Combobox.Empty />}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
    );
  },

  command: ({ path, children }) => (
    <Flex key={path} gap='sm' align='center' role='toolbar'>
      {children}
    </Flex>
  ),
});

export type TemplateProps<State> = {
  node: Node;
  state: State;
  renderer: Renderer<ReactNode>;
  options?: RenderOptions;
};

/** Render a parsed template against a state object. */
export const Template = <State,>({ node, state, renderer, options }: TemplateProps<State>) => {
  const scope: Scope = { state };
  return <>{render(node, scope, renderer, options)}</>;
};
