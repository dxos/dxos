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
  type RectNode,
  type TextNode,
  between,
  createLink,
  nodeBounds,
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

const styleOf = (element: { color?: Dsl.Color; fill?: Dsl.Fill }): NodeStyle | undefined => {
  const hue = element.color ? HUES[element.color] : undefined;
  const fill = element.fill === 'none' ? false : undefined;
  return hue || fill !== undefined ? { ...(hue ? { hue } : {}), ...(fill !== undefined ? { fill } : {}) } : undefined;
};

const withStyle = (node: Node, style: NodeStyle | undefined): Node => (style ? { ...node, style } : node);

const managed = (content: ContentMap): ElementRecord[] => Object.values(content).filter(isElementRecord);

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
          const rx = (element.w * placement.scale) / 2;
          const ry = (element.h * placement.scale) / 2;
          const node: EllipseNode = { type: 'ellipse', id, z: nextZ(), center, rx, ry, label: element.text };
          put(element.id, withStyle(node, styleOf(element)));
          break;
        }
        case 'circle': {
          const radius = element.r * placement.scale;
          const center = place(element.cx, element.cy);
          const node: EllipseNode = {
            type: 'ellipse',
            id,
            z: nextZ(),
            center,
            rx: radius,
            ry: radius,
            label: element.text,
          };
          put(element.id, withStyle(node, styleOf(element)));
          break;
        }
        case 'text': {
          const width = element.w ?? DEFAULT_SIZES.text.width;
          const height = DEFAULT_SIZES.text.height;
          const node: TextNode = {
            type: 'text',
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
          if (!element.from || !element.to) {
            break;
          }
          const source = { node: Dsl.resolveRef(element.from, object.id) };
          const target = { node: Dsl.resolveRef(element.to, object.id) };
          const link: Link = createLink({ type: 'line', id, z: nextZ(), source, target });
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
          if (node.type === 'text') {
            elements.push({ kind: 'text', id: element, x: local.x, y: local.y, w: local.w, text });
          } else if (record.dsl?.portal !== undefined) {
            elements.push({ kind: 'portal', id: element, ...local, ref: record.dsl.portal, ...(text ? { text } : {}) });
          } else {
            elements.push({
              kind: node.type === 'ellipse' ? 'ellipse' : 'rect',
              id: element,
              ...local,
              ...(text ? { text } : {}),
            });
          }
        } else {
          const from = refTo(content, record.link.source.node, id);
          const to = refTo(content, record.link.target.node, id);
          elements.push({ kind: 'arrow', id: element, from, to });
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

const textOf = (node: Node): string => {
  switch (node.type) {
    case 'rect':
    case 'ellipse':
      return node.label ?? '';
    case 'text':
      return node.text;
    case 'class':
      return node.name;
    case 'scene':
      return '';
  }
};

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
