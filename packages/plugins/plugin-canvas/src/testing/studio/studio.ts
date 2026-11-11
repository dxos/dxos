//
// Copyright 2026 DXOS.org
//

//
// The studio deck's graph slides (`studio/assets/deck/canvas`) on a canvas: the `.diagram` file is the scene, parsed
// by `@dxos/diagram` and applied through the illustrator bridge, and the `.json` sidecar carries everything the DSL
// has no word for — a card's icon and tone, a connector's waypoints, a text's role. Keeping the two apart is the
// point of the spike: what the loader has to reach into the sidecar for is exactly what the DSL lacks.
//

import * as Schema from 'effect/Schema';

import { type ContentMap, Dsl, type Scene, applyCommands } from '@dxos/diagram';
import { invariant } from '@dxos/invariant';
import { type NodeBase, endpointNode } from '@dxos/scene';

import { isLinkRecord, isNodeRecord, nodeKey } from '../../model/content.ts';
import { SceneHandler, elementId } from '../../model/handler.ts';

const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });

/** A card of the deck: a Phosphor icon, a title, its centre in slide units, and an optional accent. */
export const StudioCard = Schema.Struct({
  icon: Schema.String,
  title: Schema.String,
  cx: Schema.Number,
  cy: Schema.Number,
  w: Schema.optional(Schema.Number),
  h: Schema.optional(Schema.Number),
  /** A CSS custom property of the deck (`var(--t-trip)`), resolved through {@link TONES}. */
  tone: Schema.optional(Schema.String),
});
export type StudioCard = Schema.Schema.Type<typeof StudioCard>;

/** How a link is routed, where the deck does not draw it straight. */
export const StudioRoute = Schema.Struct({
  /** Waypoints the route passes through, in slide units. */
  via: Schema.optional(Schema.Array(Point)),
  /** An orthogonal route: horizontal then vertical, or the other way about. */
  elbow: Schema.optional(Schema.Literals(['hv', 'vh'])),
  /** A single-bend route, the bend this far off the midpoint. */
  bend: Schema.optional(Schema.Number),
  dash: Schema.optional(Schema.Boolean),
  /** Where the caption sits, when the route moves it off the midpoint. */
  labelAt: Schema.optional(Point),
});
export type StudioRoute = Schema.Schema.Type<typeof StudioRoute>;

/** `[from, to]`, `[from, to, label]` or `[from, to, label, route]`, as `export.mjs` writes an edge. */
export const StudioEdge = Schema.Union([
  Schema.Tuple([Schema.String, Schema.String, Schema.String, StudioRoute]),
  Schema.Tuple([Schema.String, Schema.String, Schema.String]),
  Schema.Tuple([Schema.String, Schema.String]),
]);
export type StudioEdge = Schema.Schema.Type<typeof StudioEdge>;

export const StudioText = Schema.Struct({
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  text: Schema.String,
  role: Schema.Literals(['heading', 'caption']),
});
export type StudioText = Schema.Schema.Type<typeof StudioText>;

export const StudioFrame = Schema.Struct({
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.Number,
  h: Schema.Number,
  label: Schema.optional(Schema.String),
});
export type StudioFrame = Schema.Schema.Type<typeof StudioFrame>;

/** A slide as `export.mjs` writes it: the whole model, of which the `.diagram` file is the expressible part. */
export const StudioModel = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  subtitle: Schema.String,
  size: Schema.Struct({ w: Schema.Number, h: Schema.Number }),
  nodes: Schema.Record(Schema.String, StudioCard),
  edges: Schema.Array(StudioEdge),
  frames: Schema.Array(StudioFrame),
  texts: Schema.optional(Schema.Array(StudioText)),
});
export type StudioModel = Schema.Schema.Type<typeof StudioModel>;

/** Reads a sidecar, so a drifted export fails here rather than halfway through a drawing. */
export const parseStudioModel = (text: string): StudioModel => Schema.decodeUnknownSync(StudioModel)(JSON.parse(text));

/** The deck's accent colours (`assets/deck/lib/deck.css`), by the custom property the model names. */
export const TONES: Record<string, string> = {
  'var(--t-event)': '#d83eff',
  'var(--t-message)': '#1fd58a',
  'var(--t-file)': '#f2c14e',
  'var(--t-trip)': '#2d6fff',
  'var(--t-sheet)': '#ff7a45',
};

/** Text sizes in scene units by the role the sidecar gives a text; the DSL's only lever is `weight=s`. */
const TEXT_SIZES: Record<string, number> = { heading: 20, caption: 15 };

/**
 * The slide's title block, which the drawing does not hold. The deck draws the title and subtitle on the slide
 * because the slide is one HTML page; in a deck of canvas drawings they belong to the presenter's own heading, and
 * a drawing that repeated them would be a second title inside the first. The sidecar keeps the text (`model.title`,
 * `model.subtitle`) for the heading to use.
 */
const TITLE_OBJECT = 'title';

/** The element id of a card's box, which is how the bridge keys its node (`<object>/box`). */
const boxOf = (key: string) => elementId(key, 'box');

/** A node's label, which only the box prototypes carry. */
const labelOf = (node: NodeBase): string | undefined =>
  'label' in node && typeof node.label === 'string' ? node.label : undefined;

/** A note's body, which is where the bridge puts a plain DSL `text`. */
const textOf = (node: NodeBase): string | undefined =>
  'text' in node && typeof node.text === 'string' ? node.text : undefined;

/** Replaces the plain boxes the DSL produced with `card` elements, taking icon and tone from the sidecar. */
const promoteCards = (content: ContentMap, model: StudioModel): void => {
  for (const [key, card] of Object.entries(model.nodes)) {
    const record = content[nodeKey(boxOf(key))];
    invariant(isNodeRecord(record), `no node for card "${key}"`);
    const { style: _style, ...node } = record.node;
    content[nodeKey(boxOf(key))] = {
      ...record,
      node: {
        ...node,
        type: 'card',
        label: labelOf(record.node) ?? card.title,
        icon: card.icon,
        ...(card.tone ? { tone: TONES[card.tone] ?? card.tone } : {}),
      },
    };
  }
};

/** The text width a label of this size needs, which the canvas does not measure for an unframed box. */
const textWidth = (label: string, fontSize: number) => label.length * fontSize * 0.62 + 16;

/**
 * Sizes the slide's text. The bridge turns a DSL `text` into a note (or, at `weight=s`, a small left-aligned label),
 * because the scene language has no notion of a heading: every size here comes from the sidecar's `role`.
 */
const styleText = (content: ContentMap, model: StudioModel): void => {
  const roles = new Map<string, number>(
    (model.texts ?? []).map((text): [string, number] => [elementId(text.id, 'label'), TEXT_SIZES[text.role]]),
  );

  for (const [id, fontSize] of roles) {
    const record = content[nodeKey(id)];
    if (!isNodeRecord(record)) {
      continue;
    }
    const { node } = record;
    // A note keeps its body in `text`; a label keeps it in `label`, which is what an unframed box draws.
    const label = labelOf(node) ?? textOf(node);
    const { text: _text, ...rest } = node;
    content[nodeKey(id)] = {
      ...record,
      node: {
        ...rest,
        type: 'rect',
        label,
        // The text is as wide as it needs to be and anchored at the left, the way the slide sets it.
        size: { width: label ? textWidth(label, fontSize) : node.size.width, height: fontSize * 1.4 },
        style: { fill: false, border: false, alignHorizontal: 'left', alignVertical: 'middle', fontSize },
      },
    };
  }
};

/**
 * Moves a frame's label out of the frame. A DSL frame can carry a label and the bridge brings it through, but a
 * box's label is drawn centred inside it, over whatever the frame contains; the deck sets its layer names beside
 * the frame instead, which is a placement the scene language has no way to state.
 */
const placeFrameLabels = (content: ContentMap, model: StudioModel): void => {
  const fontSize = TEXT_SIZES.heading;
  for (const frame of model.frames) {
    const key = nodeKey(elementId(frame.id, 'frame'));
    const record = content[key];
    if (!isNodeRecord(record) || !frame.label) {
      continue;
    }
    const { label: _label, ...node } = record.node;
    content[key] = { ...record, node };
    const width = textWidth(frame.label, fontSize);
    content[nodeKey(elementId(frame.id, 'title'))] = {
      kind: 'node',
      scene: record.scene,
      node: {
        type: 'rect',
        id: elementId(frame.id, 'title'),
        z: record.node.z,
        center: { x: frame.x - 24 - width / 2, y: frame.y + frame.h / 2 },
        size: { width, height: fontSize * 1.4 },
        label: frame.label,
        style: { fill: false, border: false, alignHorizontal: 'right', alignVertical: 'middle', fontSize },
      },
    };
  }
};

/**
 * The content key of the link between two cards. An arrow's node id is its enclosing object's and its own
 * (`links/task-spec`), so the edge is found by the ends it binds rather than by a key spelled out here.
 */
export const findLink = (content: ContentMap, from: string, to: string): string | undefined =>
  Object.keys(content).find((key) => {
    const record = content[key];
    return (
      isLinkRecord(record) &&
      endpointNode(record.link.source) === boxOf(from) &&
      endpointNode(record.link.target) === boxOf(to)
    );
  });

type Frame = { center: { x: number; y: number }; size: { width: number; height: number } };

/** The frame of a card's node, once the bridge has placed it. */
const frameOf = (content: ContentMap, key: string): Frame | undefined => {
  const record = content[nodeKey(boxOf(key))];
  return isNodeRecord(record) ? { center: record.node.center, size: record.node.size } : undefined;
};

/**
 * Where an orthogonal route meets a card: the point on the frame's outline toward the neighbouring waypoint.
 * `diagramRoute` only takes a stored route whose two ends sit on the nodes' outlines (`ROUTE_SLACK`); a route of
 * bare waypoints is discarded and the connector re-routed, so the ends have to be computed rather than guessed.
 */
const attach = (frame: Frame, toward: { x: number; y: number }): { x: number; y: number } => {
  const { center, size } = frame;
  const [halfWidth, halfHeight] = [size.width / 2, size.height / 2];
  return Math.abs(toward.y - center.y) <= halfHeight
    ? { x: center.x + (toward.x >= center.x ? halfWidth : -halfWidth), y: center.y }
    : { x: center.x, y: center.y + (toward.y >= center.y ? halfHeight : -halfHeight) };
};

/** The waypoints of a route, including the elbow the sidecar states as a direction rather than a point. */
const waypointsOf = (route: StudioRoute, source: Frame, target: Frame): { x: number; y: number }[] => {
  if (route.via?.length) {
    return [...route.via];
  }
  switch (route.elbow) {
    case 'hv':
      return [{ x: target.center.x, y: source.center.y }];
    case 'vh':
      return [{ x: source.center.x, y: target.center.y }];
    default:
      return [];
  }
};

/**
 * Puts the sidecar's routes back on the links. The DSL arrow has two ends and nothing in between, so the deck's
 * routes survive the export only as `# route=` comments, which the parser drops. The scene model does carry them —
 * `connector.route` on a link whose ends stay bound to their nodes — so this is a DSL gap, not a canvas one.
 */
const routeLinks = (content: ContentMap, model: StudioModel): number => {
  let routed = 0;
  for (const edge of model.edges) {
    const route = edge.length === 4 ? edge[3] : undefined;
    const [source, target] = [frameOf(content, edge[0]), frameOf(content, edge[1])];
    if (!route || !source || !target) {
      continue;
    }
    const waypoints = waypointsOf(route, source, target);
    if (waypoints.length === 0) {
      continue;
    }
    const key = findLink(content, edge[0], edge[1]);
    const record = key === undefined ? undefined : content[key];
    if (key === undefined || !isLinkRecord(record)) {
      continue;
    }
    content[key] = {
      ...record,
      link: {
        ...record.link,
        connector: {
          ...record.link.connector,
          // A connector draws through the diagram renderer, which reads its stroke here rather than from the link's
          // own `style`, so a dashed link would go solid the moment it is routed.
          ...(route.dash || record.link.style?.lineStyle === 'dashed' ? { stroke: 'dashed' } : {}),
          // A link's marker vocabulary is wider than a connector's head, so only the two they share carry over.
          ...(record.link.ends?.end === 'arrow' || record.link.ends?.end === 'triangle'
            ? { head: record.link.ends.end }
            : {}),
          route: [attach(source, waypoints[0]), ...waypoints, attach(target, waypoints[waypoints.length - 1])],
          ...(route.labelAt ? { caption: { x: route.labelAt.x, y: route.labelAt.y } } : {}),
        },
      },
    };
    routed++;
  }
  return routed;
};

/** What the loader had to take from the sidecar, which is the spike's finding in numbers. */
export type StudioReport = { problems: number; cards: number; routed: number };

/** Whether a command names the slide's title block, which the presenter's heading carries ({@link TITLE_OBJECT}). */
const isTitle = (command: Scene.Command): boolean =>
  'object' in command ? command.object.id === TITLE_OBJECT : 'objectId' in command && command.objectId === TITLE_OBJECT;

/**
 * Seeds a canvas from a slide: parses the `.diagram`, drops the title block, applies the rest through the
 * illustrator bridge, then repairs from the sidecar what the DSL could not carry. Returns what it had to repair.
 */
export const seedStudioSlide =
  (source: string, model: StudioModel, report?: (report: StudioReport) => void) =>
  (content: ContentMap): void => {
    const { commands, problems } = Dsl.parse(source);
    invariant(problems.length === 0, `${model.id}.diagram: ${problems.map(({ message }) => message).join('; ')}`);
    applyCommands(
      content,
      commands.filter((command) => !isTitle(command)),
      SceneHandler,
    );
    promoteCards(content, model);
    styleText(content, model);
    placeFrameLabels(content, model);
    const routed = routeLinks(content, model);
    report?.({ problems: problems.length, cards: Object.keys(model.nodes).length, routed });
  };
