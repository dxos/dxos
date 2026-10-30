//
// Copyright 2026 DXOS.org
//

//
// Illustrator DSL bridge: compiles scene-DSL objects into nodes and links of the root scene and reads
// them back, so `applyCommands` gives the canvas the illustrator operations (draw, edit, move, remove).
// A DSL element becomes an ordinary node (boxes, circles, text, portals) or link (arrows) carrying
// its identity; everything the engine cannot show (polylines, curves, arcs, free arrows) is dropped.
// On a canvas with `diagramShapes` the nodes and links are diagram shapes and connectors, which the
// diagram's own SVG renderer draws, so a laid-out diagram keeps its look, routes and captions.
//

import { type ContentHandler, type ContentMap, Diagnostics, type ReadWorldObject, type SvgFile } from '@dxos/diagram';
import {
  DEFAULT_LAYER,
  DEFAULT_SIZES,
  between,
  createLink,
  defaultNodeRegistry,
  diagramNodeElements,
  isDiagramBackdrop,
  nodeBounds,
  nodeTitle,
  sortByZ,
  topZ,
} from '@dxos/react-ui-canvas/scene';
import {
  type DiagramConnector,
  type DiagramNode,
  type DiagramShape,
  type EllipseNode,
  type Layer,
  type Link,
  type Node,
  type NodeStyle,
  type NoteNode,
  type RectNode,
  Scene,
  Shape,
  endpointNode,
  isDiagramNode,
  isEllipseNode,
  isNoteNode,
} from '@dxos/scene';

import {
  type ElementRecord,
  type LinkRecord,
  type NodeRecord,
  canvasRecordOf,
  isElementRecord,
  isLinkRecord,
  isNodeRecord,
  isSceneRecord,
  linkKey,
  nodeKey,
  sceneKey,
  seedContent,
} from './content.ts';

/** The node or link id of a DSL element. */
export const elementId = (object: string, element: string) => `${object}/${element}`;

/** DSL colours onto theme hues; black and white keep the default look. */
const HUES: Partial<Record<Shape.Color, string>> = {
  'grey': 'neutral',
  'light-violet': 'violet',
  'violet': 'violet',
  'blue': 'blue',
  'light-blue': 'sky',
  'yellow': 'yellow',
  'orange': 'orange',
  'green': 'green',
  'light-green': 'lime',
  'light-red': 'rose',
  'red': 'red',
};

const styleOf = (element: { color?: Shape.Color; fill?: Shape.Fill; stroke?: Shape.Stroke }): NodeStyle | undefined => {
  const hue = element.color ? HUES[element.color] : undefined;
  const fill = element.fill === 'none' ? false : undefined;
  // A tinted shape is a group's backdrop: a guide, an annotation the lattice and the link router pass over.
  const guide = element.fill === 'tint' ? true : undefined;
  const lineStyle = element.stroke === 'dashed' || element.stroke === 'dotted' ? element.stroke : undefined;
  const style: NodeStyle = {
    ...(hue ? { hue } : {}),
    ...(fill !== undefined ? { fill } : {}),
    ...(guide ? { guide } : {}),
    ...(lineStyle ? { lineStyle } : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};

/** The size of a box's title (a group's name), the layout's small text. */
const TITLE_FONT_SIZE = 14;

/** Px per character and line height of a small label, for sizing its box to its text (a note's default is a page). */
const LABEL_CHAR = 7;
const LABEL_HEIGHT = 20;

/** The node a free connector end lands on: the smallest frame containing the point (a box, not the group around it). */
const nodeAt = (nodes: readonly Node[], point: { x: number; y: number }, slack = 1): Node | undefined =>
  nodes
    .filter((node) => {
      const { x, y, width, height } = nodeBounds(node);
      return (
        point.x >= x - slack && point.x <= x + width + slack && point.y >= y - slack && point.y <= y + height + slack
      );
    })
    .sort((left, right) => left.size.width * left.size.height - right.size.width * right.size.height)[0];

/** The canvas markers of a connector's ends; a canvas end marker is one of arrow, circle or triangle. */
const endsOf = (arrow: Shape.Arrow): Link['ends'] => {
  const markers = Shape.markersOf(arrow);
  const marker = (value: Shape.Marker | undefined) =>
    value === 'triangle' ? 'triangle' : value === 'circle' ? 'circle' : value ? 'arrow' : undefined;
  const start = marker(markers.start);
  const end = marker(markers.end);
  return start || end ? { ...(start ? { start } : {}), ...(end ? { end } : {}) } : undefined;
};

const withStyle = (node: Node, style: NodeStyle | undefined): Node => (style ? { ...node, style } : node);

const managed = (content: ContentMap): ElementRecord[] => Object.values(content).filter(isElementRecord);

const nodesOf = (content: ContentMap): Node[] =>
  Object.values(content)
    .filter(isNodeRecord)
    .map((record) => record.node);

const nodesIn = (content: ContentMap, scene: string): Node[] =>
  managed(content)
    .filter((record): record is NodeRecord => isNodeRecord(record) && record.scene === scene)
    .map((record) => record.node);

/** A group's backdrop: a guide, or a diagram's tinted group frame. */
const isBackdrop = (node: Node): boolean => node.style?.guide === true || isDiagramBackdrop(node);

/** Small text's width and height (scene px) as the diagram renderer sets it, for the frame of a diagram text node. */
const textFrame = (element: Shape.Text, scale: number): { w: number; h: number } => {
  const { size, lineH } = Diagnostics.LABEL_TYPE[element.weight ?? 's'];
  const lines = element.text.split('\n');
  const longest = Math.max(1, ...lines.map((line) => line.length));
  return {
    w: element.w ?? Math.ceil(longest * size * Diagnostics.CHAR_EM) / scale,
    h: (lines.length * lineH) / scale,
  };
};

/** The style of a connector apart from its route: what a diagram connector keeps of an arrow, and gives back. */
const connectorStyle = ({ relation, head, tail, stroke, color }: SvgFile.ConnectorStyle): SvgFile.ConnectorStyle => ({
  ...(relation ? { relation } : {}),
  ...(head ? { head } : {}),
  ...(tail ? { tail } : {}),
  ...(stroke ? { stroke } : {}),
  ...(color ? { color } : {}),
});

/** The layer a drawing's decorations (group backdrops, guides) sit on, below the shapes they group. */
export const BACKDROP_LAYER: Layer = { id: 'backdrop', name: 'Backdrop', z: '' };

/**
 * Puts an upsert's guides on the backdrop layer and everything else on the scene's top layer. Every element is placed
 * explicitly: an element naming no layer is on the bottom one, which once there is a backdrop is the backdrop.
 */
const placeOnLayers = (content: ContentMap, scene: string, records: ContentMap) => {
  const record = content[sceneKey(scene)];
  if (!isSceneRecord(record)) {
    return;
  }
  const layers: readonly Layer[] = record.layers ? Object.values(record.layers) : [];
  const named = layers.filter((layer) => layer.id !== BACKDROP_LAYER.id);
  const own = sortByZ(named.length > 0 ? named : [DEFAULT_LAYER]);
  const main = own.at(-1) ?? DEFAULT_LAYER;
  const guides = Object.values(records).some((other) => isNodeRecord(other) && isBackdrop(other.node));
  const backdrop = guides || record.layers?.[BACKDROP_LAYER.id] !== undefined;
  for (const [key, other] of Object.entries(records)) {
    const node: NodeRecord | undefined = isNodeRecord(other) ? other : undefined;
    const link: LinkRecord | undefined = isLinkRecord(other) ? other : undefined;
    if (node) {
      records[key] = { ...node, node: { ...node.node, layer: isBackdrop(node.node) ? BACKDROP_LAYER.id : main.id } };
    } else if (link) {
      records[key] = { ...link, link: { ...link.link, layer: main.id } };
    }
  }
  if (backdrop) {
    const lowest = own[0] ?? DEFAULT_LAYER;
    content[sceneKey(scene)] = {
      ...record,
      layers: {
        ...Object.fromEntries(own.map((layer) => [layer.id, layer])),
        [BACKDROP_LAYER.id]: record.layers?.[BACKDROP_LAYER.id] ?? {
          ...BACKDROP_LAYER,
          z: between(undefined, lowest.z),
        },
      },
    };
  }
};

export const SceneHandler: ContentHandler = {
  identify: (record) =>
    isElementRecord(record) && record.dsl ? { object: record.dsl.object, element: record.dsl.element } : undefined,

  scaffold: (content) => {
    seedContent(content);
  },

  render: (object, placement, content) => {
    const scene = seedContent(content);
    // `upsert-elements` supplies only elements; the object's ref and index then come from its records.
    const existing = managed(content).find((record) => record.dsl?.object === object.id)?.dsl;
    const ref = ('ref' in object && object.ref) || existing?.ref;
    const index = ('index' in object && object.index) || existing?.index;
    const identity = (element: string): Scene.DslIdentity => ({
      object: object.id,
      element,
      ...(ref ? { ref } : {}),
      ...(index ? { index } : {}),
    });
    const place = (x: number, y: number) => ({
      x: placement.origin.x + x * placement.scale,
      y: placement.origin.y + y * placement.scale,
    });
    // Elements of one upsert stack above what is there, in DSL order; an explicit index wins.
    let z = topZ(nodesIn(content, scene));
    const nextZ = () => {
      z = between(z);
      return index ?? z;
    };

    const diagram = canvasRecordOf(content)?.diagramShapes === true;
    const records: ContentMap = {};
    const put = (element: string, node: Node) => {
      records[nodeKey(node.id)] = { kind: 'node', scene, node, dsl: identity(element) } satisfies NodeRecord;
    };

    // A small text belongs to what it captions rather than standing alone: a connector's caption
    // (`<arrow>-label`) is the link's text, and a title inside an untitled box of its object is that box's label.
    const captions = new Map<string, Shape.Text>();
    const titles = new Map<string, Shape.Text>();
    const absorbed = new Set<string>();
    for (const element of object.elements) {
      if (element.kind !== 'text' || element.weight !== 's') {
        continue;
      }
      const arrow = element.id.endsWith('-label') ? element.id.slice(0, -'-label'.length) : undefined;
      if (arrow && object.elements.some((other) => other.kind === 'arrow' && other.id === arrow)) {
        captions.set(arrow, element);
        absorbed.add(element.id);
        continue;
      }
      const box = object.elements.find(
        (other) =>
          other.kind === 'rect' &&
          !other.text &&
          !titles.has(other.id) &&
          element.x >= other.x &&
          element.x <= other.x + other.w &&
          element.y >= other.y &&
          element.y <= other.y + other.h,
      );
      if (box) {
        titles.set(box.id, element);
        absorbed.add(element.id);
      }
    }

    for (const element of object.elements) {
      if (absorbed.has(element.id)) {
        continue;
      }
      const id = elementId(object.id, element.id);
      if (diagram && element.kind !== 'arrow') {
        const shape = diagramShape(element, placement.scale);
        if (shape) {
          const title = titles.get(element.id);
          const node: DiagramNode = {
            type: 'diagram',
            id,
            z: nextZ(),
            center: place(shape.frame.x + shape.frame.w / 2, shape.frame.y + shape.frame.h / 2),
            size: { width: shape.frame.w * placement.scale, height: shape.frame.h * placement.scale },
            element: shape.element,
            ...(title || shape.text ? { label: title?.text ?? shape.text } : {}),
            ...(title
              ? {
                  heading: {
                    id: title.id,
                    x: (title.x - shape.frame.x) * placement.scale,
                    y: (title.y - shape.frame.y) * placement.scale,
                    ...(title.w === undefined ? {} : { w: title.w * placement.scale }),
                    ...(title.color ? { color: title.color } : {}),
                    ...(title.weight ? { weight: title.weight } : {}),
                  },
                }
              : {}),
          };
          records[nodeKey(id)] = {
            kind: 'node',
            scene,
            node,
            dsl: { ...identity(element.id), ...(element.kind === 'portal' ? { portal: element.ref } : {}) },
          } satisfies NodeRecord;
        }
        continue;
      }
      switch (element.kind) {
        case 'rect':
        case 'diamond':
        case 'triangle': {
          const size = { width: element.w * placement.scale, height: element.h * placement.scale };
          const center = place(element.x + element.w / 2, element.y + element.h / 2);
          const title = titles.get(element.id)?.text;
          const node: RectNode = { type: 'rect', id, z: nextZ(), center, size, label: element.text ?? title };
          const style = styleOf(element);
          // A title reads from the box's top-left corner, small, as the layout set it; a label stays centred.
          put(
            element.id,
            withStyle(
              node,
              title ? { ...style, alignHorizontal: 'left', alignVertical: 'top', fontSize: TITLE_FONT_SIZE } : style,
            ),
          );
          break;
        }
        case 'ellipse': {
          const center = place(element.x + element.w / 2, element.y + element.h / 2);
          const size = { width: element.w * placement.scale, height: element.h * placement.scale };
          const node: EllipseNode = { type: 'ellipse', id, z: nextZ(), center, size, label: element.text };
          put(element.id, withStyle(node, styleOf(element)));
          break;
        }
        case 'circle': {
          const diameter = element.r * 2 * placement.scale;
          const center = place(element.cx, element.cy);
          const node: EllipseNode = {
            type: 'ellipse',
            id,
            z: nextZ(),
            center,
            size: { width: diameter, height: diameter },
            label: element.text,
          };
          put(element.id, withStyle(node, styleOf(element)));
          break;
        }
        case 'text': {
          // A small text is a label (a group's title, a connector's caption): its own size, no frame or fill.
          if (element.weight === 's') {
            const width = element.w ?? element.text.length * LABEL_CHAR + 16;
            const height = LABEL_HEIGHT;
            const node: RectNode = {
              type: 'rect',
              id,
              z: nextZ(),
              center: place(element.x + width / 2, element.y + height / 2),
              size: { width: width * placement.scale, height: height * placement.scale },
              label: element.text,
              style: { fill: false, border: false, alignHorizontal: 'left', fontSize: 12 },
            };
            put(element.id, node);
            break;
          }
          const width = element.w ?? DEFAULT_SIZES.note.width;
          const height = DEFAULT_SIZES.note.height;
          const node: NoteNode = {
            type: 'note',
            id,
            z: nextZ(),
            center: place(element.x + width / 2, element.y + height / 2),
            size: { width: width * placement.scale, height: height * placement.scale },
            text: element.text,
          };
          put(element.id, withStyle(node, styleOf(element)));
          break;
        }
        case 'portal': {
          // No nested drawing yet: a portal shows as a titled box that carries the drawing it names.
          const size = { width: element.w * placement.scale, height: element.h * placement.scale };
          const center = place(element.x + element.w / 2, element.y + element.h / 2);
          const node: RectNode = { type: 'rect', id, z: nextZ(), center, size, label: element.text ?? element.ref };
          records[nodeKey(id)] = {
            kind: 'node',
            scene,
            node: withStyle(node, styleOf(element)),
            dsl: { ...identity(element.id), portal: element.ref },
          } satisfies NodeRecord;
          break;
        }
        case 'arrow': {
          // A laid-out connector carries points, not refs: each end binds to the node it lands on.
          // A caption (an unbordered label, from this upsert or an earlier one) is never an end.
          const shapes = [...nodesIn(content, scene), ...nodesOf(records)].filter(
            (node) => node.style?.border !== false && !(isDiagramNode(node) && node.element.kind === 'text'),
          );
          // A routed connector is its bends (`<id>-path`) then the arrow's last leg: the path starts at the source.
          const path = object.elements.find((other) => other.kind === 'line' && other.id === `${element.id}-path`);
          const start = path?.kind === 'line' ? path.points[0] : element.start;
          const from = element.from
            ? Shape.resolveRef(element.from, object.id)
            : start && nodeAt(shapes, place(start.x, start.y))?.id;
          const to = element.to
            ? Shape.resolveRef(element.to, object.id)
            : element.end && nodeAt(shapes, place(element.end.x, element.end.y))?.id;
          if (!from || !to || from === to) {
            break;
          }
          const caption = captions.get(element.id);
          const text = element.text || caption?.text;
          if (diagram) {
            // The layout's route, bends and caption included, as long as the boxes stay where the layout put them.
            const points =
              path?.kind === 'line' && element.end
                ? [...path.points, element.end]
                : element.start && element.end
                  ? [element.start, element.end]
                  : undefined;
            const connector: DiagramConnector = {
              ...connectorStyle(element),
              ...(points ? { route: points.map((point) => place(point.x, point.y)) } : {}),
              ...(caption
                ? {
                    caption: {
                      ...place(caption.x, caption.y),
                      ...(caption.w === undefined ? {} : { w: caption.w * placement.scale }),
                      ...(caption.color ? { color: caption.color } : {}),
                      ...(caption.weight ? { weight: caption.weight } : {}),
                    },
                  }
                : {}),
            };
            const link: Link = {
              ...createLink({ type: 'line', id, z: nextZ(), source: { node: from }, target: { node: to } }),
              ...(text ? { text } : {}),
              connector,
            };
            records[linkKey(id)] = { kind: 'link', scene, link, dsl: identity(element.id) } satisfies LinkRecord;
            break;
          }
          const ends = endsOf(element);
          const dashed = Shape.markersOf(element).dashed;
          // Routed by the canvas (on a lattice, along its gutters) rather than through the layout's bends: the canvas
          // attaches at its own ports, so a route through the layout's points would kink at each end.
          const link: Link = {
            ...createLink({
              type: element.from ? 'line' : 'smart',
              id,
              z: nextZ(),
              source: { node: from },
              target: { node: to },
            }),
            ...(ends ? { ends } : {}),
            ...(text ? { text } : {}),
            ...(dashed ? { style: { lineStyle: 'dashed' } } : {}),
          };
          records[linkKey(id)] = { kind: 'link', scene, link, dsl: identity(element.id) } satisfies LinkRecord;
          break;
        }
        default:
          break;
      }
    }
    placeOnLayers(content, scene, records);
    return records;
  },

  read: (content) => {
    const records = managed(content);
    const unmanaged = records.filter((record) => !record.dsl).length;
    const byObject = new Map<string, ElementRecord[]>();
    for (const record of records) {
      if (record.dsl) {
        byObject.set(record.dsl.object, [...(byObject.get(record.dsl.object) ?? []), record]);
      }
    }
    const objects: ReadWorldObject[] = [];
    for (const [id, members] of byObject) {
      const frames = members.filter(isNodeRecord).map((record) => nodeBounds(record.node));
      const origin = {
        x: frames.length ? Math.min(...frames.map((frame) => frame.x)) : 0,
        y: frames.length ? Math.min(...frames.map((frame) => frame.y)) : 0,
      };
      const first = members[0].dsl;
      const elements: Shape.Element[] = [];
      for (const record of members.sort((left, right) => (zOf(left) < zOf(right) ? -1 : 1))) {
        const element = record.dsl?.element ?? '';
        if (isNodeRecord(record)) {
          const { node } = record;
          const frame = nodeBounds(node);
          const local = { x: frame.x - origin.x, y: frame.y - origin.y, w: frame.width, h: frame.height };
          const text = textOf(node);
          if (isDiagramNode(node)) {
            elements.push(
              ...diagramNodeElements(node).map((shape) => ({
                ...translate(shape, -origin.x, -origin.y),
                ...(shape.id === node.element.id ? { id: element } : {}),
              })),
            );
          } else if (isNoteNode(node)) {
            elements.push({ kind: 'text', id: element, x: local.x, y: local.y, w: local.w, text });
          } else if (record.dsl?.portal !== undefined) {
            elements.push({ kind: 'portal', id: element, ...local, ref: record.dsl.portal, ...(text ? { text } : {}) });
          } else {
            elements.push({
              kind: isEllipseNode(node) ? 'ellipse' : 'rect',
              id: element,
              ...local,
              ...(text ? { text } : {}),
            });
          }
        } else {
          const sourceNode = endpointNode(record.link.source);
          const targetNode = endpointNode(record.link.target);
          // The DSL's arrows join elements; a link with a free end has no DSL form.
          if (sourceNode !== undefined && targetNode !== undefined) {
            const from = refTo(content, sourceNode, id);
            const to = refTo(content, targetNode, id);
            elements.push({
              kind: 'arrow',
              id: element,
              from,
              to,
              ...(record.link.text ? { text: record.link.text } : {}),
              ...(record.link.connector ? connectorStyle(record.link.connector) : {}),
            });
          }
        }
      }
      objects.push({
        id,
        origin,
        scale: 1,
        ...(first?.ref ? { ref: first.ref } : {}),
        ...(first?.index ? { index: first.index } : {}),
        elements,
      });
    }
    return { scene: { objects: objects.sort(byIndex) }, unmanaged };
  },

  translate: (record, delta) => {
    if (isNodeRecord(record)) {
      const { center } = record.node;
      record.node = { ...record.node, center: { x: center.x + delta.x, y: center.y + delta.y } };
    }
  },
};

/** A DSL element as a diagram node holds it, and its frame in the element's own units. */
const diagramShape = (
  element: Shape.Element,
  scale: number,
): { element: DiagramShape; frame: { x: number; y: number; w: number; h: number }; text?: string } | undefined => {
  switch (element.kind) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'triangle':
    case 'portal':
      return { element, frame: { x: element.x, y: element.y, w: element.w, h: element.h }, text: element.text };
    case 'circle':
      return {
        element,
        frame: { x: element.cx - element.r, y: element.cy - element.r, w: element.r * 2, h: element.r * 2 },
        text: element.text,
      };
    case 'text':
      return { element, frame: { x: element.x, y: element.y, ...textFrame(element, scale) }, text: element.text };
    default:
      return undefined;
  }
};

/** An element moved by `dx`, `dy`. */
const translate = (element: Shape.Element, dx: number, dy: number): Shape.Element => {
  switch (element.kind) {
    case 'circle':
      return { ...element, cx: element.cx + dx, cy: element.cy + dy };
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'triangle':
    case 'portal':
    case 'text':
      return { ...element, x: element.x + dx, y: element.y + dy };
    default:
      return element;
  }
};

const zOf = (record: ElementRecord) => (isNodeRecord(record) ? record.node.z : record.link.z);

// The DSL bridge has no plugin context, so it reads a node's text by the built-in types' parts; a
// contributed type's text reads back empty.
const textOf = (node: Node): string => nodeTitle(defaultNodeRegistry, node) ?? '';

/** The DSL ref of the node a link end names, relative to `object`. */
const refTo = (content: ContentMap, nodeId: string, object: string): string => {
  const record = content[nodeKey(nodeId)];
  if (isNodeRecord(record) && record.dsl) {
    return Shape.formatRef({
      ...(record.dsl.object === object ? {} : { object: record.dsl.object }),
      element: record.dsl.element,
    });
  }
  return nodeId;
};

/** Objects without an index first, in insertion order; indexed objects follow in index order. */
const byIndex = (left: ReadWorldObject, right: ReadWorldObject): number =>
  left.index === undefined
    ? right.index === undefined
      ? 0
      : -1
    : right.index === undefined
      ? 1
      : left.index < right.index
        ? -1
        : left.index > right.index
          ? 1
          : 0;
