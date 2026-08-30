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
import React, { type PropsWithChildren, type ReactNode } from 'react';

import { type Align, Button, Flex, type Gap, Grid, Input, type Justify } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Combobox, Listbox } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/ui-theme';

import { type Binding, type ModuleView, type Node, type Scope, resolve } from '../model';
import { type CreateRendererOptions, type Renderer, type RenderOptions, present, render } from '../render';
import { useAttention } from './attention';
import { Splitter } from './Splitter';

const asText = (value: unknown): string => (value == null ? '' : String(value));

const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  values.find((candidate) => candidate === value);

const GAPS: readonly Gap[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'form', 'form-section'];
const ALIGNS: readonly Align[] = ['start', 'center', 'end', 'baseline', 'stretch'];
const JUSTIFIES: readonly Justify[] = ['start', 'center', 'end', 'between', 'around', 'evenly'];

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

/** The connect surface a multi-select collection drives — senders only; reads come from state. */
type MultiSelectDriver = {
  select: (id: string, shift?: boolean) => void;
  extendTo: (id: string) => void;
};

const isMultiSelectDriver = (value: unknown): value is MultiSelectDriver =>
  typeof value === 'object' &&
  value !== null &&
  'select' in value &&
  typeof value.select === 'function' &&
  'extendTo' in value &&
  typeof value.extendTo === 'function';

/**
 * The container kind with the attention aspect: focusing anywhere inside attends the container
 * (sticky), and the attended container's ring goes primary. Hook use forces a real component —
 * renderer entries are plain functions.
 */
const AttendableContainer = ({ id, gap, children }: PropsWithChildren<{ id?: string; gap?: Gap }>) => {
  const { attended, attend } = useAttention();
  return (
    // The slottable Flex exposes no event props; a display:contents trap adds no box (the same
    // pattern the Esc key trap used) and hears every focus entering the container.
    <div role='none' className='contents' onFocusCapture={id ? () => attend(id) : undefined}>
      <Flex
        column
        gap={gap}
        classNames={mx(
          'dx-container ring-2 ring-separator rounded-sm',
          id && attended === id && 'ring-[var(--color-focus-ring-subtle)]',
        )}
      >
        {children}
      </Flex>
    </div>
  );
};

/** Resolve a `capability="alias.name"` aspect to the mounted instance's api off the `use` ring. */
const capabilityApi = (scope: Scope, ref: unknown): unknown => {
  if (typeof ref !== 'string') {
    return undefined;
  }
  const [alias, name] = ref.split('.');
  return scope.aliases?.[alias]?.apis?.[name];
};

/** Create the React renderer: one function per kind tag, resolving `schema=` against the registry. */
export const createReactRenderer = ({
  schemas,
}: CreateRendererOptions<Schema.Codec<any, any>>): Renderer<ReactNode> => ({
  container: ({ path, props, children }) => (
    <AttendableContainer
      key={path}
      id={typeof props.id === 'string' ? props.id : undefined}
      gap={oneOf(GAPS, props.gap)}
    >
      {children}
    </AttendableContainer>
  ),

  /**
   * `columns`/`rows` turn the layout into a grid with explicit tracks — geometry lives in the
   * template, not in renderer workarounds. Without them it is a flex row/column.
   */
  layout: ({ path, props, children }) => {
    const cols = tracks(props.columns);
    const rows = tracks(props.rows);
    // `resizable` swaps the fixed tracks for a zag splitter — the divider between exactly two
    // panes becomes draggable; more panes fall back to the grid, since the wrapper is two-pane.
    if (props.resizable === true && children.length === 2) {
      return <Splitter key={path} orientation={rows ? 'vertical' : 'horizontal'} panes={[children[0], children[1]]} />;
    }
    if (cols || rows) {
      return (
        <Grid key={path} cols={cols} rows={rows} gap={oneOf(GAPS, props.gap)} grow={false} classNames='dx-container'>
          {children}
        </Grid>
      );
    } else {
      return (
        <Flex key={path} {...flexProps(props)} classNames='dx-container'>
          {children}
        </Flex>
      );
    }
  },

  display: ({ path, props, data }) => (
    <span key={path} className={mx(props.variant === 'title' ? 'text-lg font-medium' : 'text-description')}>
      {asText(data.text ?? props.label)}
    </span>
  ),

  control: ({ path, node, props, data, handlers }) => {
    if (props.as === 'button') {
      // `enabled` is an intrinsic binding with `show`'s presence semantics: the button is
      // disabled while the bound value is undefined/null/false, so command availability is
      // published state, never a component callback.
      const disabled = node.data?.enabled ? !present(data.enabled) : undefined;
      return (
        <Button key={path} disabled={disabled} onClick={() => handlers.activate?.()}>
          {asText(props.label)}
        </Button>
      );
    } else {
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
    }
  },

  /**
   * With a `select` event: a Listbox whose selection is published state (`data-selection` reads it
   * back, clicking dispatches). Without one: a plain read-only list. Item identity and label come
   * from the collection's own `item-id` / `item-label` bindings.
   */
  collection: ({ path, node, props, data, handlers, scope, renderChildren }) => {
    const items = Array.isArray(data.items) ? data.items : [];

    // With a plural `data-selections` binding: a multi-select list driven by the module's
    // capability instance (`capability="alias.name"`). The rows only mark and send — selection
    // state is read back from the published slot the machine's onChange snapshots into.
    if (node.data?.selections) {
      const api = capabilityApi(scope, props.capability);
      if (!isMultiSelectDriver(api)) {
        return (
          <span key={path} className='text-error-text text-sm'>
            unresolved capability '{asText(props.capability)}'
          </span>
        );
      }
      const selections = Array.isArray(data.selections) ? data.selections.map(asText) : [];
      return (
        <Listbox.Root key={path} multiselectable>
          <Listbox.Viewport>
            <Listbox.Content>
              {items.map((item, index) => {
                const id = asText(itemField(node, scope, item, 'id') ?? index);
                return (
                  <Listbox.Item
                    key={id}
                    id={id}
                    selected={selections.includes(id)}
                    // A shift-click must not start a text selection before the row's click handler runs.
                    onMouseDown={(event) => event.shiftKey && event.preventDefault()}
                    onClick={(event) =>
                      event.shiftKey && event.altKey ? api.extendTo(id) : api.select(id, event.shiftKey)
                    }
                  >
                    <Listbox.ItemLabel>{asText(itemField(node, scope, item, 'label') ?? id)}</Listbox.ItemLabel>
                  </Listbox.Item>
                );
              })}
            </Listbox.Content>
          </Listbox.Viewport>
        </Listbox.Root>
      );
    }

    if (node.events?.select) {
      return (
        <Listbox.Root
          key={path}
          value={asText(data.selection) || undefined}
          onValueChange={(next) => handlers.select?.(next)}
          // Esc on a focused option: deselect is the same operation with no payload. The Listbox
          // fires this only when something was selected, so an empty selection dispatches nothing.
          onDeselect={() => handlers.select?.(undefined)}
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
          <Flex key={asText(itemField(node, scope, item, 'id') ?? index)} role='listitem' align='center'>
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
        <Form.Viewport scroll>
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
    <Flex key={path} align='center' role='toolbar'>
      {children}
    </Flex>
  ),

  /**
   * Tab strip over published state: the current tab is the resolved `data-value`, choosing one
   * dispatches `select`. The panels live in a sibling `switch` — tabs only set state.
   */
  tabs: ({ path, node, data, handlers }) => (
    <Tabs.Root
      key={path}
      orientation='horizontal'
      value={asText(data.value) || undefined}
      onValueChange={(next) => handlers.select?.(next)}
    >
      <Tabs.Tablist>
        {(node.children ?? [])
          .filter((child) => child.tag === 'tab')
          .map((tab) => {
            const value = asText(tab.props?.value);
            return (
              <Tabs.Button key={value} value={value}>
                {asText(tab.props?.label ?? value)}
              </Tabs.Button>
            );
          })}
      </Tabs.Tablist>
    </Tabs.Root>
  ),

  // Rendered by `tabs` from its props; never on its own.
  tab: () => null,

  // The walker already narrowed `children` to the matched branch's subtree.
  switch: ({ path, children }) => (
    <Flex key={path} column grow>
      {children}
    </Flex>
  ),

  // display:contents — a `show` inside a grid row must not break track placement with a box.
  show: ({ path, children }) => (
    <div key={path} role='none' className='contents'>
      {children}
    </div>
  ),

  // Structural only — `switch`/`show` render the matched branch's children directly, and
  // `let`/`var` exist to declare names, never to render.
  match: () => null,
  fallback: () => null,
  let: () => null,
  var: () => null,
  use: () => null,
});

export type TemplateProps = {
  node: Node;
  /** Published UI state; `let` slot values are read at `<idPath>.<name>`. */
  ui?: Readonly<Record<string, unknown>>;
  /** Host-supplied values for the root's `var` signature (validate with `checkVars` at mount). */
  vars?: Readonly<Record<string, unknown>>;
  /** Materialized module views by module key (`viewModules`); `use` aliases resolve onto them. */
  modules?: Readonly<Record<string, ModuleView>>;
  renderer: Renderer<ReactNode>;
  options?: RenderOptions<ReactNode>;
};

/** A binding that failed to resolve renders in place of its node, never as silence (R-8). */
const renderBindingError = (error: Error, path: string): ReactNode => (
  <span key={`error:${path}`} className='text-error-text text-sm'>
    {error.message}
  </span>
);

/** Render a parsed template against published state and its declared inputs. */
export const Template = ({ node, ui, vars, modules, renderer, options }: TemplateProps) => {
  const scope: Scope = { ui, vars, modules };
  return <>{render(node, scope, renderer, { onError: renderBindingError, ...options })}</>;
};
