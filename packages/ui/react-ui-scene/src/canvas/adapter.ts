//
// Copyright 2026 DXOS.org
//

import {
  type BuiltinNodeType,
  DEFAULT_LAYER,
  type Link,
  type MemoryViewStore,
  type Node,
  type NodeStyle,
  type View,
  type ViewId,
  createMemoryStore,
  createNode,
  initialKeys,
} from '@dxos/react-ui-canvas';
import { type Resolved2D, Scene, resolveLayout2D, rootScene, sceneLayout } from '@dxos/scene';

/** The scene kinds the 2D renderer draws as react-ui-canvas nodes of the same name. */
const NODE_TYPES: Readonly<Record<string, BuiltinNodeType>> = {
  rect: 'rect',
  ellipse: 'ellipse',
  polygon: 'polygon',
  note: 'note',
};

const MARKERS = ['arrow', 'circle', 'triangle'] as const;

/** Scene style tokens as react-ui-canvas's: a surface of `none` is unfilled, any other surface is filled. */
const nodeStyle = (style: Scene.Style | undefined): NodeStyle | undefined => {
  if (!style) {
    return undefined;
  }
  const { hue, tone, opacity, rounded, border, surface } = style;
  return {
    ...(hue !== undefined ? { hue } : {}),
    ...(tone !== undefined ? { tone } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(rounded !== undefined ? { rounded } : {}),
    ...(border !== undefined ? { border } : {}),
    ...(surface !== undefined ? { fill: surface !== 'none' } : {}),
  };
};

/** A composite element (its object has parts) is a `view` node over its parts layout's View. */
const toNode = (element: Resolved2D, z: string): Node | undefined => {
  const type = element.parts !== undefined ? 'view' : NODE_TYPES[element.kind];
  if (!type || !element.center) {
    return undefined;
  }
  const style = nodeStyle(element.style);
  return {
    ...createNode({ type, id: element.id, z, center: element.center, size: element.size, scene: element.parts }),
    layer: DEFAULT_LAYER.id,
    ...(element.label !== undefined ? { label: element.label } : {}),
    ...(element.rotation !== undefined ? { rotation: element.rotation } : {}),
    ...(style ? { style } : {}),
  };
};

const endpoint = ({ element, anchor }: Scene.Binding) =>
  anchor === undefined ? { node: element } : { node: element, port: anchor };

/** A link both of whose ends are in the scene; a link to a missing element is not drawn (Review Focus 1). */
const toLink = (element: Resolved2D, z: string, nodes: Readonly<Record<string, Node>>): Link | undefined => {
  const { from, to } = element;
  if (element.kind !== 'link' || !from || !to || !nodes[from.element] || !nodes[to.element]) {
    return undefined;
  }
  const end = MARKERS.find((marker) => marker === element.props?.end);
  return {
    type: 'line',
    id: element.id,
    z,
    layer: DEFAULT_LAYER.id,
    source: endpoint(from),
    target: endpoint(to),
    ...(end ? { ends: { end } } : {}),
    ...(element.label !== undefined ? { text: element.label } : {}),
    ...(element.style?.hue !== undefined ? { style: { hue: element.style.hue } } : {}),
  };
};

const toView = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): View => {
  const elements = Object.values(resolveLayout2D(doc, layout)).filter((element) => !element.hidden);
  const keys = initialKeys(elements.length);
  const nodes: Record<string, Node> = {};
  elements.forEach((element, index) => {
    const node = toNode(element, element.order ?? keys[index]);
    node && (nodes[node.id] = node);
  });
  const links: Record<string, Link> = {};
  elements.forEach((element, index) => {
    const link = toLink(element, element.order ?? keys[index], nodes);
    link && (links[link.id] = link);
  });
  return { id: layout.id, name: layout.name, nodes, links, layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER } };
};

/**
 * A document's 2D layouts as react-ui-canvas Views, one per layout, in a store the canvas reads; the scene's layout is
 * the root and comes first, and a composite element is a `view` node over its parts layout's View. 3D layouts are
 * left out.
 */
export const toCanvasViews = (
  doc: Scene.SceneDocument,
  scene: Scene.SceneRecord | undefined = rootScene(doc),
): { views: View[]; store: MemoryViewStore; root: ViewId } => {
  const rootLayout = sceneLayout(doc, scene)?.id;
  const views = doc.layouts
    .flatMap((layout) => (layout.dim === '2d' ? [toView(doc, layout)] : []))
    .sort((left, right) => Number(right.id === rootLayout) - Number(left.id === rootLayout));
  const root = views[0]?.id ?? '';
  return { views, store: createMemoryStore(views, {}, { root }), root };
};
