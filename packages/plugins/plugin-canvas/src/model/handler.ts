//
// Copyright 2026 DXOS.org
//

//
// Illustrator DSL bridge: compiles scene-DSL objects into nodes and links of the root scene and reads
// them back, so `applyCommands` gives the canvas the illustrator operations (draw, edit, move, remove).
// A DSL element becomes an ordinary node (boxes, circles, text, portals) or link (arrows) carrying
// its identity; everything the engine cannot show (polylines, curves, arcs, free arrows) is dropped.
//

import { type ContentHandler, type ContentMap, Scene as Dsl, type ReadWorldObject } from '@dxos/diagram';
import {
  DEFAULT_SIZES,
  type EllipseNode,
  type Link,
  type Node,
  type NodeStyle,
  type NoteNode,
  type RectNode,
  between,
  createLink,
  defaultNodeRegistry,
  endpointNode,
  isEllipseNode,
  isNoteNode,
  nodeBounds,
  nodeTitle,
  topZ,
} from '@dxos/react-ui-canvas/scene';

import {
  type DslIdentity,
  type ElementRecord,
  type LinkRecord,
  type NodeRecord,
  isElementRecord,
  isNodeRecord,
  linkKey,
  nodeKey,
  seedContent,
} from './content.ts';

/** The node or link id of a DSL element. */
export const elementId = (object: string, element: string) => `${object}/${element}`;

/** DSL colours onto theme hues; black and white keep the default look. */
const HUES: Partial<Record<Dsl.Color, string>> = {
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

const styleOf = (element: { color?: Dsl.Color; fill?: Dsl.Fill; stroke?: Dsl.Stroke }): NodeStyle | undefined => {
  const hue = element.color ? HUES[element.color] : undefined;
  const fill = element.fill === 'none' ? false : undefined;
  // A tint is the faintest tone of the hue: a group's backdrop, not a shape of its own.
  const tone = element.fill === 'tint' ? 0 : undefined;
  const lineStyle = element.stroke === 'dashed' || element.stroke === 'dotted' ? element.stroke : undefined;
  const style: NodeStyle = {
    ...(hue ? { hue } : {}),
    ...(fill !== undefined ? { fill } : {}),
    ...(tone !== undefined ? { tone } : {}),
    ...(lineStyle ? { lineStyle } : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};

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
const endsOf = (arrow: Dsl.Arrow): Link['ends'] => {
  const markers = Dsl.markersOf(arrow);
  const marker = (value: Dsl.Marker | undefined) =>
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
    const identity = (element: string): DslIdentity => ({
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

    const records: ContentMap = {};
    const put = (element: string, node: Node) => {
      records[nodeKey(node.id)] = { kind: 'node', scene, node, dsl: identity(element) } satisfies NodeRecord;
    };
    for (const element of object.elements) {
      const id = elementId(object.id, element.id);
      switch (element.kind) {
        case 'rect':
        case 'diamond':
        case 'triangle': {
          const size = { width: element.w * placement.scale, height: element.h * placement.scale };
          const center = place(element.x + element.w / 2, element.y + element.h / 2);
          const node: RectNode = { type: 'rect', id, z: nextZ(), center, size, label: element.text };
          put(element.id, withStyle(node, styleOf(element)));
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
            const width = (element.w ?? element.text.length * LABEL_CHAR + 16) * placement.scale;
            const height = LABEL_HEIGHT * placement.scale;
            const node: RectNode = {
              type: 'rect',
              id,
              z: nextZ(),
              center: place(element.x + width / 2, element.y + height / 2),
              size: { width, height },
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
            (node) => node.style?.border !== false,
          );
          // A routed connector is its bends (`<id>-path`) then the arrow's last leg: the path starts at the source.
          const path = object.elements.find((other) => other.kind === 'line' && other.id === `${element.id}-path`);
          const start = path?.kind === 'line' ? path.points[0] : element.start;
          const from = element.from
            ? Dsl.resolveRef(element.from, object.id)
            : start && nodeAt(shapes, place(start.x, start.y))?.id;
          const to = element.to
            ? Dsl.resolveRef(element.to, object.id)
            : element.end && nodeAt(shapes, place(element.end.x, element.end.y))?.id;
          if (!from || !to || from === to) {
            break;
          }
          const ends = endsOf(element);
          const dashed = Dsl.markersOf(element).dashed;
          // A routed connector keeps its route: a spline through its bends, so its caption stays beside it.
          const bends = path?.kind === 'line' ? path.points.slice(1).map((point) => place(point.x, point.y)) : [];
          const base = createLink({
            type: element.from ? 'line' : bends.length > 0 ? 'spline' : 'smart',
            id,
            z: nextZ(),
            source: { node: from },
            target: { node: to },
          });
          const link: Link = {
            ...(base.type === 'spline' ? { ...base, points: bends } : base),
            ...(ends ? { ends } : {}),
            ...(dashed ? { style: { lineStyle: 'dashed' } } : {}),
          };
          records[linkKey(id)] = { kind: 'link', scene, link, dsl: identity(element.id) } satisfies LinkRecord;
          break;
        }
        default:
          break;
      }
    }
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
      const elements: Dsl.Element[] = [];
      for (const record of members.sort((left, right) => (zOf(left) < zOf(right) ? -1 : 1))) {
        const element = record.dsl?.element ?? '';
        if (isNodeRecord(record)) {
          const { node } = record;
          const frame = nodeBounds(node);
          const local = { x: frame.x - origin.x, y: frame.y - origin.y, w: frame.width, h: frame.height };
          const text = textOf(node);
          if (isNoteNode(node)) {
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
            elements.push({ kind: 'arrow', id: element, from, to });
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

const zOf = (record: ElementRecord) => (isNodeRecord(record) ? record.node.z : record.link.z);

// The DSL bridge has no plugin context, so it reads a node's text by the built-in types' parts; a
// contributed type's text reads back empty.
const textOf = (node: Node): string => nodeTitle(defaultNodeRegistry, node) ?? '';

/** The DSL ref of the node a link end names, relative to `object`. */
const refTo = (content: ContentMap, nodeId: string, object: string): string => {
  const record = content[nodeKey(nodeId)];
  if (isNodeRecord(record) && record.dsl) {
    return Dsl.formatRef({
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
