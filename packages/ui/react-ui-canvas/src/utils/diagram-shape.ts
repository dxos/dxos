//
// Copyright 2026 DXOS.org
//

//
// Diagram nodes and connectors as the diagram DSL's elements, drawn by `@dxos/diagram`'s `SvgFile` (the renderer that
// writes a diagram's SVG file), so a laid-out diagram reads on the canvas exactly as it does in the file. Only where an
// edit has moved a connector's end off the route the layout gave it does the canvas route it itself, in the same style.
//

import { Diagnostics, Scene as Dsl, SvgFile, UmlGrid } from '@dxos/diagram';
import { type Bounds, type Point } from '@dxos/scene';

import { type DiagramConnector, type DiagramNode, type Link, type Node, isDiagramNode } from '../model/index.ts';
import { nodeBounds } from './shapes.ts';

/** How far (scene px) a route's end may sit from its node's outline and still be the route the layout gave it. */
const ROUTE_SLACK = 1;

/** Space (scene px) between a re-routed connector's caption and the run it labels. */
const CAPTION_GAP = 8;

const rectOf = ({ x, y, width, height }: Bounds): SvgFile.Rect => ({ x, y, w: width, h: height });

/** Distance from a point to a rectangle's outline, whether the point is inside it or not. */
const outlineDistance = ({ x, y, w, h }: SvgFile.Rect, point: Point): number => {
  const dx = Math.max(x - point.x, 0, point.x - (x + w));
  const dy = Math.max(y - point.y, 0, point.y - (y + h));
  const outside = Math.hypot(dx, dy);
  return outside > 0 ? outside : Math.min(point.x - x, x + w - point.x, point.y - y, y + h - point.y);
};

/** The text a diagram node draws, or nothing when it is hidden (its label is being edited in place). */
const shownText = (node: DiagramNode, hideLabel: boolean): string | undefined =>
  hideLabel || !node.label ? undefined : node.label;

/**
 * The node's DSL elements in scene coordinates: its element over the node's frame, carrying the node's label unless
 * the node has a heading, which then carries it from the frame's top-left corner.
 */
export const diagramNodeElements = (node: DiagramNode, { hideLabel = false } = {}): Dsl.Element[] => {
  const bounds = nodeBounds(node);
  const text = shownText(node, hideLabel);
  const own = node.heading ? undefined : text;
  const { element, heading } = node;
  const shape: Dsl.Element | undefined =
    element.kind === 'circle'
      ? {
          ...element,
          cx: bounds.x + bounds.width / 2,
          cy: bounds.y + bounds.height / 2,
          r: Math.min(bounds.width, bounds.height) / 2,
          text: own,
        }
      : element.kind === 'text'
        ? own === undefined
          ? undefined
          : { ...element, x: bounds.x, y: bounds.y, w: element.w === undefined ? undefined : bounds.width, text: own }
        : { ...element, x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height, text: own };
  const title: Dsl.Element | undefined =
    heading && text !== undefined
      ? {
          kind: 'text',
          id: heading.id,
          x: bounds.x + heading.x,
          y: bounds.y + heading.y,
          text,
          ...(heading.w === undefined ? {} : { w: heading.w }),
          ...(heading.color ? { color: heading.color } : {}),
          ...(heading.weight ? { weight: heading.weight } : {}),
        }
      : undefined;
  return [...(shape ? [shape] : []), ...(title ? [title] : [])];
};

/** The node as `SvgFile` draws its elements, in scene coordinates. */
export const diagramNodeMarkup = (node: DiagramNode, options: { hideLabel?: boolean } = {}): SvgFile.Markup[] => {
  const object: Dsl.WorldObject = { id: node.id, elements: diagramNodeElements(node, options) };
  return object.elements.flatMap(
    (element) => SvgFile.elementMarkup(object, element, new Map(), SvgFile.markerIds(node.id)) ?? [],
  );
};

/** A connector's route, and whether it is the one the layout gave it (`laid`) or one the canvas routed. */
export type DiagramRoute = { points: Point[]; laid: boolean };

/**
 * The route a connector between two frames takes: the layout's while both its ends still meet their frames' outlines;
 * once a frame has moved, one the layout's own router finds around the `obstacles` (`UmlGrid.rerouteConnector`); and
 * a connector the layout never routed runs straight between the frames' borders, as `SvgFile` draws a bound arrow.
 */
export const diagramRoute = (
  connector: DiagramConnector,
  source: Bounds,
  target: Bounds,
  obstacles: readonly Bounds[] = [],
): DiagramRoute => {
  const [from, to] = [rectOf(source), rectOf(target)];
  const route = connector.route;
  if (route && route.length >= 2) {
    const laid =
      outlineDistance(from, route[0]) <= ROUTE_SLACK && outlineDistance(to, route[route.length - 1]) <= ROUTE_SLACK;
    return laid
      ? { points: [...route], laid }
      : { points: UmlGrid.rerouteConnector(from, to, obstacles.map(rectOf)), laid };
  }
  const object: Dsl.WorldObject = { id: 'connector', elements: [] };
  const targets = new Map([
    ['connector/source', from],
    ['connector/target', to],
  ]);
  const points = Diagnostics.arrowPoints(
    object,
    { kind: 'arrow', id: 'connector', from: 'source', to: 'target' },
    targets,
  );
  return { points: points ?? [], laid: false };
};

/** Where a caption goes on a route the canvas made: beside the longest run, centred on it. */
const placeCaption = (points: readonly Point[], text: string, weight: Dsl.Weight): Point => {
  const runs = points.slice(1).map((end, index) => ({ start: points[index], end }));
  const longest = runs.reduce((best, run) =>
    Math.hypot(run.end.x - run.start.x, run.end.y - run.start.y) >
    Math.hypot(best.end.x - best.start.x, best.end.y - best.start.y)
      ? run
      : best,
  );
  const mid = { x: (longest.start.x + longest.end.x) / 2, y: (longest.start.y + longest.end.y) / 2 };
  const { size, lineH } = Diagnostics.LABEL_TYPE[weight];
  const width = text.length * size * Diagnostics.CHAR_EM;
  return longest.start.y === longest.end.y
    ? { x: mid.x - width / 2, y: mid.y - lineH - CAPTION_GAP / 2 }
    : { x: mid.x + CAPTION_GAP, y: mid.y - lineH / 2 };
};

/**
 * The connector's DSL elements along `route`: the `-path` polyline and arrow `SvgFile.connectorElements` splits a route
 * into, and the caption where the layout placed it (or beside the longest run of a route the canvas made).
 */
export const diagramLinkElements = (link: Link, connector: DiagramConnector, route: DiagramRoute): Dsl.Element[] => {
  const caption = connector.caption;
  const weight = caption?.weight ?? 's';
  const text = link.text || undefined;
  // A two-point connector with no placed caption carries its text itself, at its middle, as an unrouted arrow does.
  const inline = text !== undefined && !caption && route.points.length === 2;
  const at =
    text === undefined || inline
      ? undefined
      : route.laid && caption
        ? caption
        : placeCaption(route.points, text, weight);
  return [
    ...SvgFile.connectorElements(link.id, route.points, connector, inline ? text : undefined),
    ...(at && text !== undefined
      ? [
          {
            kind: 'text' as const,
            id: `${link.id}-label`,
            x: at.x,
            y: at.y,
            text,
            ...(caption?.w === undefined || !route.laid ? {} : { w: caption.w }),
            ...(caption?.color ? { color: caption.color } : {}),
            weight,
          },
        ]
      : []),
  ];
};

/** The connector as `SvgFile` draws it, in scene coordinates, its end markers referencing `markers`. */
export const diagramLinkMarkup = (
  link: Link,
  connector: DiagramConnector,
  route: DiagramRoute,
  markers: SvgFile.MarkerIds,
): SvgFile.Markup[] => {
  const object: Dsl.WorldObject = { id: link.id, elements: diagramLinkElements(link, connector, route) };
  return object.elements.flatMap((element) => SvgFile.elementMarkup(object, element, new Map(), markers) ?? []);
};

/** Whether a node is a diagram group's backdrop (a tinted box), which sits under the shapes it groups. */
export const isDiagramBackdrop = (node: Node): boolean => isDiagramNode(node) && node.element.fill === 'tint';

/** Whether a re-routed connector keeps clear of a node: a box does, a group's backdrop or a caption it may cross. */
export const isRouteObstacle = (node: Node): boolean =>
  node.style?.guide !== true && !isDiagramBackdrop(node) && !(isDiagramNode(node) && node.element.kind === 'text');
