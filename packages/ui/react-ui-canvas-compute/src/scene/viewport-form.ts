//
// Copyright 2026 DXOS.org
//

//
// The 2D viewport draws through react-ui-canvas's engine, which reads a node's own fields from an element's
// `props.canvas` and writes them back there. A compute element keeps its kind's fields at its top (decision 13), so
// they are moved down for drawing and back up from every intent the viewport writes.
//

import { type KindRegistry, type LayoutIntent, type Port, Scene } from '@dxos/scene';

import { type BoardElement } from './echo-store.ts';

type Kinds = Pick<KindRegistry, 'has'>;

/** The fields every 2D element has, which the engine reads from the element itself. */
const SLOTS: ReadonlySet<string> = new Set(Object.keys(Scene.Element2D.fields));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isKind = (element: { readonly type?: string }, kinds: Kinds): boolean =>
  element.type !== undefined && element.type !== 'link' && kinds.has(element.type);

const lower = (element: BoardElement, ports: readonly Port[] | undefined): BoardElement => {
  const slots = Object.fromEntries(Object.entries(element).filter(([key]) => SLOTS.has(key)));
  const own = Object.fromEntries(Object.entries(element).filter(([key]) => !SLOTS.has(key)));
  const canvas = isRecord(element.props?.canvas) ? element.props.canvas : {};
  return {
    ...slots,
    id: element.id,
    props: { ...element.props, canvas: { ...canvas, ...own, ...(ports ? { ports } : {}) } },
  };
};

/**
 * The layout as the 2D viewport draws it: each element of a registered kind with its own fields (and `ports`, the
 * compute node's runtime ports where it has them) under `props.canvas`.
 */
export const toViewportLayout = (
  layout: Scene.LayoutRecord2D,
  kinds: Kinds,
  ports?: (element: BoardElement) => readonly Port[] | undefined,
): Scene.LayoutRecord2D => ({
  ...layout,
  elements: Object.fromEntries(
    Object.entries(layout.elements).map(([id, element]) => [
      id,
      isKind(element, kinds) ? lower(element, ports?.(element)) : element,
    ]),
  ),
});

/**
 * An element the viewport wrote, with its kind's fields back at its top. Ports are dropped, being the runtime's; a
 * field that still equals the stored element's keeps the stored value, so a reference the engine copied as JSON stays
 * a reference.
 */
const lift = (element: Record<string, unknown>, stored: BoardElement | undefined): Record<string, unknown> => {
  const { props, ...slots } = element;
  const { canvas, ...rest } = isRecord(props) ? props : {};
  const { ports: _ports, ...own } = isRecord(canvas) ? canvas : {};
  const kept = Object.fromEntries(
    Object.entries(own).map(([key, value]) => {
      const current = stored?.[key];
      return [key, current !== undefined && JSON.stringify(current) === JSON.stringify(value) ? current : value];
    }),
  );
  return { ...slots, ...kept, ...(Object.keys(rest).length > 0 ? { props: rest } : {}) };
};

/** An intent the viewport wrote over `layout`, with every element of a registered kind lifted back. */
export const fromViewportIntent = (intent: LayoutIntent, layout: Scene.LayoutRecord2D, kinds: Kinds): LayoutIntent => {
  switch (intent.kind) {
    case 'create':
      return isKind(intent.element, kinds)
        ? {
            kind: 'create',
            element: { ...intent.element, ...lift(intent.element, layout.elements[intent.element.id]) },
          }
        : intent;
    case 'update': {
      const { value } = intent;
      return intent.path.length === 0 && isRecord(value) && isKind(value, kinds)
        ? { ...intent, value: lift(value, layout.elements[intent.id]) }
        : intent;
    }
    case 'batch':
      return { kind: 'batch', intents: intent.intents.map((inner) => fromViewportIntent(inner, layout, kinds)) };
    default:
      return intent;
  }
};
