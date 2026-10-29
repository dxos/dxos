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
import { Scene } from '@dxos/scene';

/** The scene kinds the 2D renderer draws as react-ui-canvas nodes of the same name. */
const NODE_TYPES: Readonly<Record<string, BuiltinNodeType>> = {
  rect: 'rect',
  ellipse: 'ellipse',
  polygon: 'polygon',
  note: 'note',
  scene: 'view',
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

const toNode = (element: Scene.Element2D, z: string): Node | undefined => {
  const type = NODE_TYPES[element.kind];
  if (!type || !element.center) {
    return undefined;
  }
  const style = nodeStyle(element.style);
  return {
    ...createNode({ type, id: element.id, z, center: element.center, size: element.size, scene: element.scene }),
    layer: DEFAULT_LAYER.id,
    ...(element.label !== undefined ? { label: element.label } : {}),
    ...(element.rotation !== undefined ? { rotation: element.rotation } : {}),
    ...(style ? { style } : {}),
  };
};

const endpoint = ({ element, anchor }: Scene.Binding) =>
  anchor === undefined ? { node: element } : { node: element, port: anchor };

/** A link both of whose ends are in the scene; a link to a missing element is not drawn (Review Focus 1). */
const toLink = (element: Scene.Element2D, z: string, nodes: Readonly<Record<string, Node>>): Link | undefined => {
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

const toView = (scene: Scene.SceneRecord2D): View => {
  const elements = Object.values(scene.elements).filter((element) => !element.hidden);
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
  return { id: scene.id, name: scene.name, nodes, links, layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER } };
};

/**
 * A document's 2D scenes as react-ui-canvas Views, one per scene, in a store the canvas reads; a `scene` element
 * becomes a `view` node over its child scene's View. 3D scenes are left out.
 */
export const toCanvasViews = (doc: Scene.SceneDocument): { views: View[]; store: MemoryViewStore; root: ViewId } => {
  const views = doc.scenes.flatMap((scene) => (scene.dim === '2d' ? [toView(scene)] : []));
  const root = views[0]?.id ?? '';
  return { views, store: createMemoryStore(views, {}, { root }), root };
};
