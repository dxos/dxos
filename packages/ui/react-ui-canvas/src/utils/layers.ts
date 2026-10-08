//
// Copyright 2026 DXOS.org
//

//
// Scene layers: every node and link is on exactly one, the layers are ordered, and a hidden one is neither drawn nor
// hit. A scene that names no layers has one, implicitly, which the first layer edit makes real.
//

import {
  type Element,
  type Intent,
  type Layer,
  type LayerId,
  type Link,
  type Node,
  type Scene,
  endpointNode,
} from '../model/types.ts';
import { between, sortByZ, topZ } from './order.ts';

/** The layer of a scene that names none: every element is on it. */
export const DEFAULT_LAYER: Layer = { id: 'layer', name: 'Layer 1', z: between() };

/** A scene's layers, bottom first; a scene with none has the implicit `DEFAULT_LAYER`. */
export const sceneLayers = (scene: Scene): Layer[] => {
  const layers = sortByZ(Object.values(scene.layers ?? {}));
  return layers.length > 0 ? layers : [DEFAULT_LAYER];
};

/** The layer an element is on: its own, else (unset, or a layer the scene does not have) the bottom one. */
export const elementLayer = (element: Element, layers: readonly Layer[]): LayerId =>
  element.layer !== undefined && layers.some((layer) => layer.id === element.layer)
    ? element.layer
    : (layers[0]?.id ?? DEFAULT_LAYER.id);

/** The layer new elements go on: the active one when the scene has it, else the top layer. */
export const activeLayer = (scene: Scene, active: LayerId | undefined): LayerId => {
  const layers = sceneLayers(scene);
  return layers.find((layer) => layer.id === active)?.id ?? layers[layers.length - 1].id;
};

/** Nodes in paint order: by their layer's order, then by their own `z`. */
export const layerOrder = (nodes: readonly Node[], layers: readonly Layer[]): Node[] => {
  const rank = new Map(layers.map((layer, index) => [layer.id, index]));
  const rankOf = (node: Node) => rank.get(elementLayer(node, layers)) ?? 0;
  return sortByZ(nodes).sort((left, right) => rankOf(left) - rankOf(right));
};

/**
 * The scene as drawn and hit: without the elements of hidden layers, or the links to a node that is hidden. The same
 * scene when no layer is hidden, so a memo over it holds.
 */
export const visibleScene = (scene: Scene): Scene => {
  const layers = sceneLayers(scene);
  const hidden = new Set(layers.filter((layer) => layer.hidden).map((layer) => layer.id));
  if (hidden.size === 0) {
    return scene;
  }
  const nodes = Object.fromEntries(
    Object.entries(scene.nodes).filter(([, node]) => !hidden.has(elementLayer(node, layers))),
  );
  const shown = (link: Link) =>
    !hidden.has(elementLayer(link, layers)) &&
    [link.source, link.target].every((end) => {
      const node = endpointNode(end);
      return node === undefined || nodes[node] !== undefined;
    });
  const links = Object.fromEntries(Object.entries(scene.links).filter(([, link]) => shown(link)));
  return { ...scene, nodes, links };
};

/** The scene's layers as a record, the implicit layer made real so a new layer does not take its elements. */
const layerRecord = (scene: Scene): Record<LayerId, Layer> =>
  scene.layers && Object.keys(scene.layers).length > 0 ? { ...scene.layers } : { [DEFAULT_LAYER.id]: DEFAULT_LAYER };

/** Applies a layer intent to the scene (`reduceIntent` delegates here). */
export const reduceLayerIntent = (scene: Scene, intent: Extract<Intent, { kind: 'layer' | 'removeLayer' }>): Scene => {
  if (intent.kind === 'layer') {
    return { ...scene, layers: { ...layerRecord(scene), [intent.layer.id]: intent.layer } };
  }
  const layers = sceneLayers(scene);
  if (layers.length < 2 || !layers.some((layer) => layer.id === intent.id)) {
    return scene;
  }
  const { [intent.id]: _, ...rest } = layerRecord(scene);
  // The elements on the removed layer go with it; `elementLayer` is read against the layers before the removal.
  const keep = (element: Element) => elementLayer(element, layers) !== intent.id;
  const nodes = Object.fromEntries(Object.entries(scene.nodes).filter(([, node]) => keep(node)));
  const links = Object.fromEntries(
    Object.entries(scene.links).filter(
      ([, link]) =>
        keep(link) &&
        [link.source, link.target].every((end) => {
          const node = endpointNode(end);
          return node === undefined || nodes[node] !== undefined;
        }),
    ),
  );
  return { ...scene, nodes, links, layers: rest };
};

/** A new layer above the others. */
export const createLayer = (scene: Scene, id: LayerId): Layer => {
  const layers = sceneLayers(scene);
  return { id, name: `Layer ${layers.length + 1}`, z: topZ(layers) };
};

/** The layer moved to `index` in the bottom-first order. */
export const moveLayer = (scene: Scene, id: LayerId, index: number): Layer | undefined => {
  const layers = sceneLayers(scene);
  const layer = layers.find((candidate) => candidate.id === id);
  if (!layer) {
    return undefined;
  }
  const others = layers.filter((candidate) => candidate.id !== id);
  return { ...layer, z: between(others[index - 1]?.z, others[index]?.z) };
};

/**
 * Merging layers into `into`, as one batch: the elements of every layer in `from` move onto `into`, keeping their own
 * order, and those layers are removed. None unless `into` and at least one other of `from` are layers of the scene.
 */
export const mergeLayersIntent = (scene: Scene, from: readonly LayerId[], into: LayerId): Intent | undefined => {
  const layers = sceneLayers(scene);
  const ids = new Set(layers.map((layer) => layer.id));
  const merged = new Set(from.filter((id) => id !== into && ids.has(id)));
  if (!ids.has(into) || merged.size === 0) {
    return undefined;
  }
  const moved = [...Object.values(scene.nodes), ...Object.values(scene.links)].filter((element) =>
    merged.has(elementLayer(element, layers)),
  );
  return {
    kind: 'batch',
    intents: [
      // The implicit layer is made real first, so the elements left on it keep it once the others are gone.
      ...(scene.layers ? [] : layers.map((layer): Intent => ({ kind: 'layer', layer }))),
      ...moved.map((element): Intent => ({ kind: 'update', id: element.id, values: { layer: into } })),
      ...[...merged].map((id): Intent => ({ kind: 'removeLayer', id })),
    ],
  };
};
