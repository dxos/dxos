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
  type DiagramConnector,
  type DiagramNode,
  type DiagramShape,
  type EllipseNode,
  type Layer,
  type Link,
  type Node,
  NODE_TYPES,
  type NodeStyle,
  type NoteNode,
  type RectNode,
  Scene,
  Shape,
  endpointNode,
  isDiagramNode,
  isEllipseNode,
  isHullNode,
  isNoteNode,
  solveGrids,
} from '@dxos/scene';

import { defaultNodeRegistry } from '../components/index.ts';
import {
  DEFAULT_LAYER,
  DEFAULT_SIZES,
  between,
  createLink,
  diagramNodeElements,
  isDiagramBackdrop,
  nodeBounds,
  nodeTitle,
  sortByZ,
  topZ,
} from '../utils/index.ts';
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

type StyleFields = Pick<Shape.Box, 'color' | 'fill' | 'stroke' | 'border' | 'align' | 'valign' | 'fontSize'>;

const styleOf = (element: StyleFields): NodeStyle | undefined => {
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
    ...(element.border !== undefined ? { border: element.border } : {}),
    ...(element.align ? { alignHorizontal: element.align } : {}),
    ...(element.valign ? { alignVertical: element.valign } : {}),
    ...(element.fontSize !== undefined ? { fontSize: element.fontSize } : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};

/** The DSL color for a hue; a hue two colors share reads as the stronger. */
const COLORS: Partial<Record<string, Shape.Color>> = {
  neutral: 'grey',
  violet: 'violet',
  blue: 'blue',
  sky: 'light-blue',
  yellow: 'yellow',
  orange: 'orange',
  green: 'green',
  lime: 'light-green',
  rose: 'light-red',
  red: 'red',
};

/** The DSL fields {@link styleOf} read, for a style a shape already has on the canvas. */
const fieldsOf = (style: NodeStyle | undefined): StyleFields => {
  const color = style?.hue ? COLORS[style.hue] : undefined;
  const fill = style?.guide ? 'tint' : style?.fill === false ? 'none' : undefined;
  return {
    ...(color ? { color } : {}),
    ...(fill ? { fill } : {}),
    ...(style?.lineStyle === 'dashed' || style?.lineStyle === 'dotted' ? { stroke: style.lineStyle } : {}),
    ...(style?.border !== undefined ? { border: style.border } : {}),
    ...(style?.alignHorizontal ? { align: style.alignHorizontal } : {}),
    ...(style?.alignVertical ? { valign: style.alignVertical } : {}),
    ...(style?.fontSize !== undefined ? { fontSize: style.fontSize } : {}),
  };
};

/** The size of a box's title (a group's name), the layout's small text. */
const TITLE_FONT_SIZE = 14;

/** A title's inset from its box's corner, the on-screen label's padding. */
const TITLE_INSET = 8;

/** The box a title was read from, by the id `read` gives a title. */
const titleOwner = (id: string): string | undefined => id.match(/^(.+)-title(?:-\d+)?$/)?.[1];

const contains = (box: Shape.Box, { x, y }: Shape.Point): boolean =>
  x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;

/** The small text `read` split out of `box`, if any. */
const titleOf = (elements: readonly Shape.Element[], box: Shape.Box): Shape.Text | undefined =>
  elements.find(
    (element): element is Shape.Text =>
      element.kind === 'text' && element.weight === 's' && titleOwner(element.id) === box.id && contains(box, element),
  );

/** Whether a node's label reads as a title, from the top-left corner of its box. */
const isTitled = ({ style }: Node): boolean => style?.alignHorizontal === 'left' && style.alignVertical === 'top';

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

/** The canvas markers of a connector's ends; one the canvas has no marker for is an arrow. */
const endsOf = (arrow: Shape.Arrow): Link['ends'] => {
  const markers = Shape.markersOf(arrow);
  const marker = (value: Shape.Marker | undefined) =>
    value === 'triangle' || value === 'circle' || value === 'diamond' || value === 'diamond-filled'
      ? value
      : value === 'crowsfoot'
        ? 'many'
        : value
          ? 'arrow'
          : undefined;
  const start = marker(markers.start);
  const end = marker(markers.end);
  return start || end ? { ...(start ? { start } : {}), ...(end ? { end } : {}) } : undefined;
};

/**
 * The arrow markers of a link's own ends, the inverse of {@link endsOf}. A link on a plain canvas keeps its markers
 * here rather than on a connector, which only a routed link has, so without this every such link printed with no
 * `head` and came back as the default arrow: 51 of the studio deck's 64 connectors lost their triangle.
 *
 * Only the markers an arrow can spell are given back. A `diamond` end has no `ArrowHead`, and a marker reached
 * through a `relation` cannot be read back as that relation, since several relations draw the same marker.
 */
const arrowEnds = (
  ends: Link['ends'],
  connector: Link['connector'],
): { head?: Shape.ArrowHead; tail?: Shape.ArrowTail } => {
  // A link with no end marker draws no arrowhead, and an arrow's default head IS an arrow, so the absence has to be
  // written down: the deck's two dashed connectors grew arrowheads without this. A headless arrow with no tail is
  // stored with no `ends` at all (see `endsOf`), so that reads as headless too, unless a connector says the markers.
  const head: Shape.ArrowHead | undefined =
    ends?.end === 'triangle'
      ? 'triangle'
      : ends?.end === 'many'
        ? 'crowsfoot'
        : ends?.end === 'arrow'
          ? 'arrow'
          : ends
            ? ends.end === undefined
              ? 'none'
              : undefined
            : connector === undefined
              ? 'none'
              : undefined;
  const tail: Shape.ArrowTail | undefined =
    ends?.start === 'circle' || ends?.start === 'arrow' ? ends.start : undefined;
  return { ...(head ? { head } : {}), ...(tail ? { tail } : {}) };
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

/** A group's backdrop: a guide, a hull, or a diagram's tinted group frame. */
const isBackdrop = (node: Node): boolean => node.style?.guide === true || isHullNode(node) || isDiagramBackdrop(node);

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

/** A shape as updated, with the style it has on the canvas where the update does not restate one. */
const withStoredStyle = (content: ContentMap, object: string, element: Shape.Element): Shape.Element => {
  const record = managed(content).find(({ dsl }) => dsl?.object === object && dsl.element === element.id);
  return (element.kind === 'rect' || element.kind === 'ellipse') && record && isNodeRecord(record)
    ? { ...fieldsOf(record.node.style), ...element }
    : element;
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
    const parentOf = new Map(
      object.elements.filter(isBox).flatMap((box) => (box.parent ? [[box.id, box.parent] as const] : [])),
    );
    const put = (element: string, node: Node) => {
      // The grid that placed it, carried on the node: its frame here is the rule's result, and the membership is
      // the only part of the rule the child itself holds.
      const parent = parentOf.get(element);
      records[nodeKey(node.id)] = {
        kind: 'node',
        scene,
        node: parent ? { ...node, parent } : node,
        dsl: identity(element),
      } satisfies NodeRecord;
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
      const around = object.elements.filter(
        (other): other is Shape.Box =>
          other.kind === 'rect' && !other.text && !titles.has(other.id) && contains(other, element),
      );
      // A title names its box when `read` wrote it; otherwise it belongs to the innermost box around it, since an
      // untitled outer box also contains the title of a box inside it.
      const box =
        around.find((other) => other.id === titleOwner(element.id)) ??
        around.sort((left, right) => left.w * left.h - right.w * right.h)[0];
      if (box) {
        titles.set(box.id, element);
        absorbed.add(element.id);
      }
    }

    // Grids place what names them before anything is drawn: the rule is what the object stores, and a child's
    // coordinates are a cached projection of it, so they are re-solved here rather than read back. A drawing with
    // no grid skips this entirely, so it costs nothing where nothing is placed.
    const boxes = object.elements.filter(isBox);
    const solved = boxes.some((box) => box.kind === 'grid') ? solveGrids(boxes) : undefined;
    const framed = <T extends Shape.Element>(element: T): T => {
      const frame = solved?.get(element.id);
      return frame && isBox(element) ? ({ ...element, ...frame } as T) : element;
    };

    for (const original of object.elements) {
      if (absorbed.has(original.id)) {
        continue;
      }
      const element = framed(original);
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
      // A contributed kind draws its own frame, label and parts, so the box restores the kind and its fields
      // whatever box shape carries it — an ellipse naming one kept the kind through the text and lost it here.
      // A built-in type name is NOT a contributed kind: `kind=diagram` would store a diagram node with no
      // `element`, and reading the drawing back then threw on its missing `kind`.
      if (isBox(element) && element.type && !isBuiltinType(element.type)) {
        const size = { width: element.w * placement.scale, height: element.h * placement.scale };
        const center = place(element.x + element.w / 2, element.y + element.h / 2);
        const label = element.text ?? titles.get(element.id)?.text;
        const kind: Node = {
          ...(element.data ? { data: element.data } : {}),
          type: element.type,
          id,
          z: nextZ(),
          center,
          size,
          ...(label ? { label } : {}),
        };
        put(element.id, withStyle(kind, styleOf(element)));
        continue;
      }
      switch (element.kind) {
        case 'grid': {
          // A grid is a frame that places what names it. It draws nothing of its own by default, as a CSS grid
          // container does not, but it IS a box: a style it states wins, so a container with a visible frame is
          // written rather than faked with a rect behind it.
          //
          // The RULE goes on the node, not just its result: the children's frames here are a cached projection,
          // and without the rule beside them `read` could only give back the boxes where they landed — the grid,
          // its tracks and every `parent` gone, which is a drawing that cannot be re-solved.
          const size = { width: element.w * placement.scale, height: element.h * placement.scale };
          const center = place(element.x + element.w / 2, element.y + element.h / 2);
          const node: Node & Record<string, unknown> = {
            type: 'grid',
            id,
            z: nextZ(),
            center,
            size,
            ...(element.text !== undefined ? { label: element.text } : {}),
            data: {
              ...(element.cols !== undefined ? { cols: element.cols } : {}),
              ...(element.rows !== undefined ? { rows: element.rows } : {}),
              ...(element.gap !== undefined ? { gap: element.gap } : {}),
              ...(element.padding !== undefined ? { padding: element.padding } : {}),
              ...(element.layout !== undefined ? { layout: element.layout } : {}),
              ...(element.packSeed !== undefined ? { packSeed: element.packSeed } : {}),
              ...(element.packMin !== undefined ? { packMin: element.packMin } : {}),
              ...(element.packMax !== undefined ? { packMax: element.packMax } : {}),
              ...(element.autoCols !== undefined ? { autoCols: element.autoCols } : {}),
              ...(element.autoRows !== undefined ? { autoRows: element.autoRows } : {}),
              ...(element.justifyContent !== undefined ? { justifyContent: element.justifyContent } : {}),
              ...(element.alignContent !== undefined ? { alignContent: element.alignContent } : {}),
            },
          };
          put(element.id, withStyle(node, { fill: false, border: false, ...styleOf(element) }));
          break;
        }
        case 'rect':
        case 'diamond':
        case 'triangle': {
          const size = { width: element.w * placement.scale, height: element.h * placement.scale };
          const center = place(element.x + element.w / 2, element.y + element.h / 2);
          const title = titles.get(element.id)?.text;
          const style = styleOf(element);
          const node: RectNode = { type: 'rect', id, z: nextZ(), center, size, label: element.text ?? title };
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
          // `a#s2 -> b#n2` pins each end to a port, which is how a fan of links leaves one point rather than
          // spreading along a side; without one the canvas picks the closest pair on every projection.
          const source = { node: from, ...endPort(element.from) };
          const target = { node: to, ...endPort(element.to) };
          const caption = captions.get(element.id);
          const text = element.text || caption?.text;
          if (diagram) {
            // The layout's route, bends and caption included, as long as the boxes stay where the layout put them.
            // A stated route first: an arrow carrying `via` says where it runs, and reading it back out of the
            // companion line or the free ends cannot recover bends neither of those holds.
            const points = element.route?.length
              ? [...element.route]
              : path?.kind === 'line' && element.end
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
              ...createLink({ type: element.path ?? 'smart', id, z: nextZ(), source, target }),
              ...(text ? { text } : {}),
              connector,
            };
            records[linkKey(id)] = { kind: 'link', scene, link, dsl: identity(element.id) } satisfies LinkRecord;
            break;
          }
          const ends = endsOf(element);
          // The stroke the arrow states, or the dashes its relation draws where it states none.
          const pattern =
            element.stroke === 'dotted' ? 'dotted' : Shape.markersOf(element).dashed ? 'dashed' : undefined;
          // A link's own line style, which is where a plain canvas keeps what a routed link keeps on its connector.
          const lineStyle: Link['style'] = {
            ...(pattern ? { lineStyle: pattern } : {}),
            ...(element.color && HUES[element.color] ? { hue: HUES[element.color] } : {}),
          };
          // Routed by the canvas (on a lattice, along its gutters) rather than through the layout's bends: the canvas
          // attaches at its own ports, so a route through the layout's points would kink at each end.
          const link: Link = {
            ...createLink({ type: element.path ?? 'smart', id, z: nextZ(), source, target }),
            ...(ends ? { ends } : {}),
            ...(text ? { text } : {}),
            ...(Object.keys(lineStyle).length ? { style: lineStyle } : {}),
            // A stated route overrides the canvas's own: the author said where the connector runs, and a link with
            // no route is still left to the canvas, which attaches at its own ports.
            ...(element.route?.length
              ? { connector: { ...connectorStyle(element), route: element.route.map(({ x, y }) => place(x, y)) } }
              : {}),
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

  // `read` shows a title as its own element but it lives on the box's record, so the two are replaced together; `read`
  // omits a shape's style, so a partial update keeps whatever it does not restate.
  completeElements: (previous, elements, content) => {
    const ids = new Set(elements.map((element) => element.id));
    const added: Shape.Element[] = [];
    for (const box of previous.elements) {
      if (box.kind !== 'rect') {
        continue;
      }
      const title = titleOf(previous.elements, box);
      if (!title) {
        continue;
      }
      const updated = elements.find((element) => element.id === box.id);
      if (updated?.kind === 'rect' && !updated.text && !ids.has(title.id)) {
        added.push({ ...title, x: title.x + updated.x - box.x, y: title.y + updated.y - box.y });
      } else if (!updated && ids.has(title.id)) {
        added.push(box);
      }
    }
    return [...added, ...elements].map((element) => withStoredStyle(content, previous.id, element));
  },

  // Removing a title is an update of the box it lives on, so the box goes back without it.
  rewriteOnRemove: (previous, elementIds, content) =>
    previous.elements.flatMap((box) => {
      const title = box.kind === 'rect' ? titleOf(previous.elements, box) : undefined;
      return title && elementIds.has(title.id) && !elementIds.has(box.id)
        ? [withStoredStyle(content, previous.id, box)]
        : [];
    }),

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
      const taken = new Set(members.map((record) => record.dsl?.element ?? ''));
      const titleId = (box: string) => {
        let candidate = `${box}-title`;
        for (let suffix = 2; taken.has(candidate); suffix++) {
          candidate = `${box}-title-${suffix}`;
        }
        taken.add(candidate);
        return candidate;
      };
      const placedBy = (node: Node): { parent?: string } => {
        const parent = node.parent;
        return typeof parent === 'string' && parent.length > 0 ? { parent } : {};
      };
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
          } else if (node.type === 'grid') {
            // The rule back out of the node, so the text says how the children are placed rather than only where
            // they landed. Their frames stay as they are: a cached projection the next render re-solves.
            const rule = dataOf(node) ?? {};
            elements.push({
              kind: 'grid',
              id: element,
              ...local,
              ...(typeof rule.cols === 'number' || typeof rule.cols === 'string' ? { cols: rule.cols } : {}),
              ...(typeof rule.rows === 'number' || typeof rule.rows === 'string' ? { rows: rule.rows } : {}),
              ...(typeof rule.gap === 'number' ? { gap: rule.gap } : {}),
              ...(typeof rule.padding === 'number' ? { padding: rule.padding } : {}),
              ...(rule.layout === 'pack' ? { layout: 'pack' as const } : {}),
              ...(typeof rule.packSeed === 'number' ? { packSeed: rule.packSeed } : {}),
              ...(typeof rule.packMin === 'number' ? { packMin: rule.packMin } : {}),
              ...(typeof rule.packMax === 'number' ? { packMax: rule.packMax } : {}),
              ...(typeof rule.autoCols === 'number' || typeof rule.autoCols === 'string'
                ? { autoCols: rule.autoCols }
                : {}),
              ...(typeof rule.autoRows === 'number' || typeof rule.autoRows === 'string'
                ? { autoRows: rule.autoRows }
                : {}),
              ...placeOf('justifyContent', rule.justifyContent),
              ...placeOf('alignContent', rule.alignContent),
              ...(text ? { text } : {}),
              // A grid's own defaults are not worth writing down: it draws no fill and no border unless told to,
              // so emitting them would put two words on every grid that say only "as usual".
              ...gridStyle(node.style),
              ...placedBy(node),
            });
          } else if (!isBuiltinType(node.type)) {
            const data = dataOf(node);
            elements.push({
              kind: 'rect',
              id: element,
              ...local,
              type: node.type,
              ...(data ? { data } : {}),
              ...(text ? { text } : {}),
              ...fieldsOf(node.style),
              ...placedBy(node),
            });
          } else if (text && !isEllipseNode(node) && isTitled(node)) {
            // A box's text is always centred, so a title is its own small text, which `upsert` folds back into the box.
            elements.push(
              { kind: 'rect', id: element, ...local },
              {
                kind: 'text',
                id: titleId(element),
                x: local.x + TITLE_INSET,
                y: local.y + TITLE_INSET,
                w: Math.max(local.w - 2 * TITLE_INSET, 0),
                text,
                weight: 's',
              },
            );
          } else {
            // The style the box is drawn with, which `read` used to drop: a borderless, centred label came back as
            // a bordered box with its text in the corner, which is what a slide's column headings turned into.
            elements.push({
              kind: isEllipseNode(node) ? 'ellipse' : 'rect',
              id: element,
              ...local,
              ...(text ? { text } : {}),
              ...fieldsOf(node.style),
              ...placedBy(node),
            });
          }
        } else {
          const sourceNode = endpointNode(record.link.source);
          const targetNode = endpointNode(record.link.target);
          // The DSL's arrows join elements; a link with a free end has no DSL form.
          if (sourceNode !== undefined && targetNode !== undefined) {
            const from = refTo(content, sourceNode, id, portOf(record.link.source));
            const to = refTo(content, targetNode, id, portOf(record.link.target));
            elements.push({
              kind: 'arrow',
              id: element,
              from,
              to,
              ...(record.link.text ? { text: record.link.text } : {}),
              // `smart` is what an arrow with no `path` becomes, so writing it back would be noise.
              ...(record.link.type !== 'smart' && (Shape.Path.literals as readonly string[]).includes(record.link.type)
                ? { path: record.link.type as Shape.Path }
                : {}),
              ...(record.link.connector?.route?.length
                ? { route: record.link.connector.route.map(({ x, y }) => ({ x: x - origin.x, y: y - origin.y })) }
                : {}),
              // The connector first, then the link's own style and markers, which win where it has them: on a
              // plain canvas the link's style is what is drawn, and the two disagree on a drawing whose links were
              // built record by record (the Agents slide stores `blue` on the link and `light-blue` on the
              // connector). The connector still fills in what the link does not say, such as a `relation`.
              ...(record.link.connector ? connectorStyle(record.link.connector) : {}),
              ...fieldsOf(record.link.style),
              ...arrowEnds(record.link.ends, record.link.connector),
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

/** The four closed shapes that share a frame, and the only elements a contributed `kind=` may ride on. */
const isBox = (element: Shape.Element): element is Shape.Box =>
  (Shape.BoxKind.literals as readonly string[]).includes(element.kind);

/** One of a grid's `*-content` rules, where the stored value is still one of the three the schema names. */
const placeOf = <Name extends 'justifyContent' | 'alignContent'>(
  name: Name,
  value: unknown,
): Partial<Record<Name, Shape.Place>> =>
  typeof value === 'string' && (Shape.Place.literals as readonly string[]).includes(value)
    ? ({ [name]: value as Shape.Place } as Partial<Record<Name, Shape.Place>>)
    : {};

/** A grid's style, less the no-fill and no-border it takes by default. */
const gridStyle = (style: NodeStyle | undefined): StyleFields => {
  const { fill, border, ...rest } = fieldsOf(style);
  return {
    ...rest,
    ...(fill !== undefined && fill !== 'none' ? { fill } : {}),
    ...(border === true ? { border } : {}),
  };
};

/** Whether the type is one the engine draws itself, as against a kind a plugin contributed. */
const isBuiltinType = (type: string): boolean => NODE_TYPES.includes(type as (typeof NODE_TYPES)[number]);

/**
 * A contributed kind's own fields: the `data` bag the kind keeps them in, flat, scalars only. The DSL has no
 * spelling for a list or a nested object, so those are left out rather than printed as a string the parser would
 * hand back as that string.
 *
 * A kind's remaining top-level fields (a card's `icon`, `body` and `footer`) are NOT carried. Placing a name back
 * on the right side of that split needs the kind's own schema, which only the registry that holds the kind has and
 * the handler has no general access to; the card's are its composite template's parts, which is where they belong.
 */
const dataOf = (node: Node): Record<string, unknown> | undefined => {
  const bag = Reflect.get(node, 'data');
  if (typeof bag !== 'object' || bag === null || Array.isArray(bag)) {
    return undefined;
  }
  const scalars = Object.entries(bag).filter(
    ([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
  );
  return scalars.length ? Object.fromEntries(scalars) : undefined;
};

/** The DSL ref of the node a link end names, relative to `object`. */
const refTo = (content: ContentMap, nodeId: string, object: string, port?: string): string => {
  const record = content[nodeKey(nodeId)];
  if (isNodeRecord(record) && record.dsl) {
    return Shape.formatRef({
      ...(record.dsl.object === object ? {} : { object: record.dsl.object }),
      element: record.dsl.element,
      ...(port ? { port } : {}),
    });
  }
  return nodeId;
};

/** The port a DSL ref pins its end to, as a link endpoint carries it. */
const endPort = (ref: string | undefined): { port?: string } => {
  const port = ref === undefined ? undefined : Shape.parseRef(ref).port;
  return port ? { port } : {};
};

/** The port an end is pinned to; a free end has none. */
const portOf = (end: Link['source']): string | undefined => ('port' in end ? end.port : undefined);

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
