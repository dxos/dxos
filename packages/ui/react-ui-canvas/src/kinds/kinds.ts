//
// Copyright 2026 DXOS.org
//

//
// Plugin element kinds in 2D (COMMON-CORE.md decisions 13 and 21). A kind's element keeps its own fields under `data`,
// over the shared `Element2D` base, so no kind's field meets the base's or another kind's. The 2D viewport still draws
// through react-ui-canvas's engine, which reads a node's fields from an element's `props.canvas` (R-18), so `data` and
// the engine's own fields are moved down for drawing and back up from every intent the viewport writes, and the
// engine's node type is derived from the kind.
//

import * as Schema from 'effect/Schema';

import { KindRegistry, type LayoutIntent, type Node, type Port, Scene, nodeBase } from '@dxos/scene';

import { type CreateProps, type NodeDefSpec, templateCompositeId } from '../model/index.ts';

/** An element as a layout stores it: the 2D base and any field of its kind. */
export type KindElement = Scene.LayoutRecord2D['elements'][string];

/** The kinds a host draws, by type, and the fields each keeps under `data`. */
export type Kinds = Pick<KindRegistry, 'has' | 'dataFields'>;

/** The fields every 2D element has, which the engine reads from the element itself. */
const SLOTS: ReadonlySet<string> = new Set(Object.keys(Scene.Element2D.fields));

/** A slot the engine's node carries under the same name and meaning, so a kind may require it. */
const SHARED_SLOTS: ReadonlySet<string> = new Set(['label']);

/** The slot a kind's own fields are kept in, on its element and on the engine's node alike. */
const DATA = 'data';

/**
 * A plugin's element kind for the 2D editor: its element schema (`Schema.Struct({ ...Scene.Element2D.fields, type:
 * Schema.Literal(…), data: Schema.Struct({ …own }) })`), a new element of it, and how the canvas draws and edits it
 * (every other field is the canvas's node definition, which {@link kindNodeDef} completes from the kind). Only the
 * core's fields sit at the element's top: the base's, and those of the prototype a kind extends, whose frame reads
 * them from the node itself (a card's `icon`, `body` and `footer`). A kind that extends none and declares a field of
 * its own there is refused.
 *
 * A kind may name a prototype (`extends: 'card'`), as a built-in type does: the host resolves it against
 * `defaultNodePrototypes` when it builds the registry, so a contributed kind inherits a shared look, parts and
 * sizing instead of restating them.
 */
export type ElementKindSpec = Omit<NodeDefSpec, 'schema' | 'create'> & {
  schema: Schema.Codec<Scene.Element2D, unknown> & { readonly fields: Schema.Struct.Fields };
  create: (props: CreateProps) => Scene.Element2D;
};

/** The fields of `fields` the base has no slot for: the engine's own on an element, a prototype's on a kind's schema. */
const unslotted = <V>(fields: Readonly<Record<string, V>>): Record<string, V> =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !SLOTS.has(key)));

/**
 * The fields of `fields` the engine's node carries as the kind declares them: its `data`, the shared slots, and the
 * fields of its prototype.
 */
const carried = <V>(fields: Readonly<Record<string, V>>): Record<string, V> =>
  Object.fromEntries(
    Object.entries(fields).filter(([key]) => key === DATA || SHARED_SLOTS.has(key) || !SLOTS.has(key)),
  );

/**
 * The canvas engine's node type for a kind: the node base, the kind's `data` (and its `label`), so the engine's
 * palette, in-place editing and Properties form read the kind's fields from the node's `data`.
 */
export const kindNodeDef = (type: string, { schema, create, ...spec }: ElementKindSpec): NodeDefSpec => {
  const stray = spec.extends === undefined ? Object.keys(unslotted(schema.fields)) : [];
  if (stray.length > 0) {
    throw new Error(`Kind '${type}' declares ${stray.join(', ')} at its top: a kind's own fields go under data.`);
  }
  // A kind that declares a composite template keeps its own type and fields and names the composite it draws, so its
  // data stays typed while its parts are a composite's (`PlacedComposite`).
  const composite = spec.template === undefined ? {} : { composite: templateCompositeId(type) };
  // The base's own `data` is any record, which is no field of the kind's to show.
  const own = Object.fromEntries(
    Object.entries(carried(schema.fields)).filter(([, field]) => field !== Scene.Element2D.fields.data),
  );
  return {
    // A templated kind draws through the Instance view and needs no component of its own.
    ...(spec.template === undefined ? {} : { extends: 'object' }),
    ...spec,
    schema: Schema.Struct({ ...own, ...nodeBase, type: Schema.Literal(type) }),
    create: (props: CreateProps): Node => ({ ...carried(create(props)), ...props, ...composite, type }),
  };
};

/**
 * A node's `data` as its kind's schema types it, for the kind's view to draw from; none when the node carries data
 * the schema refuses. A node with no `data` reads as an empty one, so a kind whose fields are all optional draws.
 */
export const kindData = <A>(schema: Schema.Codec<A, unknown>, node: object): A | undefined => {
  const data: unknown = Reflect.get(node, DATA) ?? {};
  return Schema.is(schema)(data) ? data : undefined;
};

/** The registry that validates elements of `kinds` (each against its own schema). */
export const kindRegistry = (kinds: Readonly<Record<string, ElementKindSpec>>): KindRegistry =>
  Object.entries(kinds).reduce((registry, [type, { schema }]) => registry.register(type, schema), new KindRegistry());

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isKind = (element: { readonly type?: string }, kinds: Kinds): boolean =>
  element.type !== undefined && element.type !== 'link' && kinds.has(element.type);

/** The entries of `fields` whose key is, or is not, one of `names`. */
const split = (fields: Readonly<Record<string, unknown>>, names: readonly string[], named: boolean) =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => names.includes(key) === named));

const lower = (element: KindElement, kinds: Kinds, ports: readonly Port[] | undefined): KindElement => {
  const fields = element.type === undefined ? [] : kinds.dataFields(element.type);
  const slots = Object.fromEntries(Object.entries(element).filter(([key]) => SLOTS.has(key) && key !== DATA));
  const own = { ...(isRecord(element.props?.canvas) ? element.props.canvas : {}), ...unslotted(element) };
  // An element stored before kinds kept their fields under `data` has them at its top, or under the canvas fields:
  // each is read from there unless `data` holds one of that name, and the element's next write stores it in `data`.
  const data = { ...split(own, fields, true), ...element.data };
  return {
    ...slots,
    id: element.id,
    props: {
      ...element.props,
      canvas: {
        ...split(own, fields, false),
        ...(element.data !== undefined || Object.keys(data).length > 0 ? { [DATA]: data } : {}),
        ...(ports ? { ports } : {}),
      },
    },
  };
};

/**
 * The layout as the 2D viewport draws it: each element of a registered kind with its `data`, the engine's own fields
 * (and `ports`, where the host derives them) under `props.canvas`. A kind's element written there before keeps drawing
 * as it was.
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
      isKind(element, kinds) ? lower(element, kinds, ports?.(element)) : element,
    ]),
  ),
});

/** Every 2D layout of `document` as the viewport draws it ({@link toViewportLayout}). */
export const toViewportDocument = (document: Scene.SceneDocument, kinds: Kinds): Scene.SceneDocument => ({
  ...document,
  layouts: document.layouts.map((layout) => (layout.dim === '2d' ? toViewportLayout(layout, kinds) : layout)),
});

/**
 * An element the viewport wrote, with its `data` and the engine's fields back at its top. The `derived` fields (the
 * host's, such as runtime ports) are dropped; a field that still equals the stored element's keeps the stored value, so a reference the
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
