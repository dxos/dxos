//
// Copyright 2026 DXOS.org
//

//
// Plugin element kinds in 2D (COMMON-CORE.md decision 13). A kind's element keeps its own fields at its top, over the
// shared `Element2D` base. The 2D viewport still draws through react-ui-canvas's engine, which reads a node's own
// fields from an element's `props.canvas` (R-18), so the fields are moved down for drawing and back up from every
// intent the viewport writes, and the engine's node type is derived from the kind.
//

import * as Schema from 'effect/Schema';

import { KindRegistry, type LayoutIntent, type Node, type Port, Scene, nodeBase } from '@dxos/scene';

import type { CreateProps, NodeDefSpec } from '../model/index.ts';

/** An element as a layout stores it: the 2D base and any field of its kind. */
export type KindElement = Scene.LayoutRecord2D['elements'][string];

/** The kinds a host draws, by type. */
export type Kinds = Pick<KindRegistry, 'has'>;

/** The fields every 2D element has, which the engine reads from the element itself. */
const SLOTS: ReadonlySet<string> = new Set(Object.keys(Scene.Element2D.fields));

/** A slot the engine's node carries under the same name and meaning, so a kind may require it. */
const SHARED_SLOTS: ReadonlySet<string> = new Set(['label']);

/**
 * A plugin's element kind for the 2D editor: its element schema (`Schema.Struct({ ...Scene.Element2D.fields, type:
 * Schema.Literal(…), …own })`), a new element of it, and how the canvas draws and edits it (every other field is the
 * canvas's node definition, which {@link kindNodeDef} completes from the kind).
 */
export type ElementKindSpec = Omit<NodeDefSpec, 'schema' | 'create' | 'extends'> & {
  schema: Schema.Codec<Scene.Element2D, unknown> & { readonly fields: Schema.Struct.Fields };
  create: (props: CreateProps) => Scene.Element2D;
};

/** The kind's own fields of `fields`, with the slots both forms share when `shared`. */
const ownOf = <V>(fields: Readonly<Record<string, V>>, shared: boolean): Record<string, V> =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !SLOTS.has(key) || (shared && SHARED_SLOTS.has(key))));

/**
 * The canvas engine's node type for a kind: the node base and the kind's own fields (and its `label`), so the engine's
 * palette, in-place editing and Properties form read the kind's fields from the node.
 */
export const kindNodeDef = (type: string, { schema, create, ...spec }: ElementKindSpec): NodeDefSpec => {
  return {
    ...spec,
    schema: Schema.Struct({ ...ownOf(schema.fields, true), ...nodeBase, type: Schema.Literal(type) }),
    create: (props: CreateProps): Node => ({ ...ownOf(create(props), true), ...props, type }),
  };
};

/** The registry that validates elements of `kinds` (each against its own schema). */
export const kindRegistry = (kinds: Readonly<Record<string, ElementKindSpec>>): KindRegistry =>
  Object.entries(kinds).reduce((registry, [type, { schema }]) => registry.register(type, schema), new KindRegistry());

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isKind = (element: { readonly type?: string }, kinds: Kinds): boolean =>
  element.type !== undefined && element.type !== 'link' && kinds.has(element.type);

const lower = (element: KindElement, ports: readonly Port[] | undefined): KindElement => {
  const slots = Object.fromEntries(Object.entries(element).filter(([key]) => SLOTS.has(key)));
  const canvas = isRecord(element.props?.canvas) ? element.props.canvas : {};
  return {
    ...slots,
    id: element.id,
    props: { ...element.props, canvas: { ...canvas, ...ownOf(element, false), ...(ports ? { ports } : {}) } },
  };
};

/**
 * The layout as the 2D viewport draws it: each element of a registered kind with its own fields (and `ports`, where
 * the host derives them) under `props.canvas`. A kind's element written there before keeps drawing as it was.
 */
export const toViewportLayout = (
  layout: Scene.LayoutRecord2D,
  kinds: Kinds,
  ports?: (element: KindElement) => readonly Port[] | undefined,
): Scene.LayoutRecord2D => ({
  ...layout,
  elements: Object.fromEntries(
    Object.entries(layout.elements).map(([id, element]) => [
      id,
      isKind(element, kinds) ? lower(element, ports?.(element)) : element,
    ]),
  ),
});

/** Every 2D layout of `document` as the viewport draws it ({@link toViewportLayout}). */
export const toViewportDocument = (document: Scene.SceneDocument, kinds: Kinds): Scene.SceneDocument => ({
  ...document,
  layouts: document.layouts.map((layout) => (layout.dim === '2d' ? toViewportLayout(layout, kinds) : layout)),
});

/**
 * An element the viewport wrote, with its kind's fields back at its top. The `derived` fields (the host's, such as
 * runtime ports) are dropped; a field that still equals the stored element's keeps the stored value, so a reference the
 * engine copied as JSON stays a reference.
 */
const lift = (
  element: Record<string, unknown>,
  stored: KindElement | undefined,
  derived: readonly string[],
): Record<string, unknown> => {
  const { props, ...slots } = element;
  const { canvas, ...rest } = isRecord(props) ? props : {};
  const own = Object.entries(isRecord(canvas) ? canvas : {}).filter(([key]) => !derived.includes(key));
  const kept = Object.fromEntries(
    own.map(([key, value]) => {
      const current = stored?.[key];
      return [key, current !== undefined && JSON.stringify(current) === JSON.stringify(value) ? current : value];
    }),
  );
  return { ...slots, ...kept, ...(Object.keys(rest).length > 0 ? { props: rest } : {}) };
};

/** An intent the viewport wrote over `layout`, with every element of a registered kind lifted back. */
export const fromViewportIntent = (
  intent: LayoutIntent,
  layout: Scene.LayoutRecord2D,
  kinds: Kinds,
  derived: readonly string[] = [],
): LayoutIntent => {
  switch (intent.kind) {
    case 'create': {
      if (!isKind(intent.element, kinds)) {
        return intent;
      }
      // The lifted fields replace `props`, so the drawn `props.canvas` is not stored beside them.
      const { props: _props, ...element } = intent.element;
      return { kind: 'create', element: { ...element, ...lift(intent.element, layout.elements[element.id], derived) } };
    }
    case 'update': {
      const { value } = intent;
      return intent.path.length === 0 && isRecord(value) && isKind(value, kinds)
        ? { ...intent, value: lift(value, layout.elements[intent.id], derived) }
        : intent;
    }
    case 'batch':
      return {
        kind: 'batch',
        intents: intent.intents.map((inner) => fromViewportIntent(inner, layout, kinds, derived)),
      };
    default:
      return intent;
  }
};
