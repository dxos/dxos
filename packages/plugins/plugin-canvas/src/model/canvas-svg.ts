//
// Copyright 2026 DXOS.org
//

import { type ReadWorldObject, type Scene, SvgFile } from '@dxos/diagram';
import {
  SceneHandler,
  defaultNodeRegistry,
  diagramLinkElements,
  flattenPath,
  sortByZ,
  viewLinkGeometry,
  visibleView,
} from '@dxos/react-ui-canvas';
import { canvasRecordOf, isNodeRecord, linkKey, readViews } from '@dxos/react-ui-canvas/headless';
import { type DiagramConnector, type Link, fromEcho } from '@dxos/scene';

import { type Canvas } from '#types';

import { CanvasLayoutBuilder, readCanvasContent } from './canvas-content.ts';
import { openScene } from './canvas-document.ts';

/** The diagram a canvas's open Layout2D draws, as the command protocol's world objects. */
export const canvasWorld = (canvas: Canvas.Canvas): ReadWorldObject[] => CanvasLayoutBuilder.read(canvas).scene.objects;

/**
 * How the canvas ends a plain link, in the markers the diagram renderer has at each end; the renderer draws a diamond
 * only from a relation, so a diamond at the source becomes aggregation or composition.
 */
const connectorOf = ({ connector, ends }: Link): DiagramConnector => {
  if (connector) {
    return connector;
  }

  const head = ends?.end === undefined ? 'none' : ends.end === 'triangle' || ends.end === 'arrow' ? ends.end : 'arrow';
  switch (ends?.start) {
    case 'diamond':
      return { relation: 'aggregation', head };
    case 'diamond-filled':
      return { relation: 'composition', head };
    case 'triangle':
      return { head, tail: 'arrow' };
    default:
      return { head, tail: ends?.start ?? 'none' };
  }
};

/**
 * The open view as it draws on screen: its links along the routes the canvas engine gives them, since the diagram
 * renderer would route them on its own, and every node, including those the DSL did not draw.
 */
const openViewWorld = (canvas: Canvas.Canvas): Scene.WorldObject[] => {
  const scene = openScene(canvas);
  const content = readCanvasContent(canvas);
  const root = canvasRecordOf(content)?.root;
  const view = root === undefined ? undefined : readViews(content)[root];
  if (!scene || !view) {
    return [];
  }

  const layout = fromEcho(scene).layouts.find(({ id }) => id === root);
  const visible = visibleView(view);
  const links = viewLinkGeometry(
    visible,
    defaultNodeRegistry,
    sortByZ(Object.values(visible.links)),
    layout?.dim === '2d' ? layout.lattice : undefined,
  ).map(({ link, path, diagram }) => ({
    id: linkKey(link.id),
    elements: diagramLinkElements(
      link,
      connectorOf(link),
      diagram ?? { points: flattenPath(path).flat(), laid: false },
    ),
  }));
  const nodes = Object.fromEntries(
    Object.entries(content).flatMap(([key, record]) =>
      isNodeRecord(record) && record.node.id in visible.nodes
        ? [[key, record.dsl ? record : { ...record, dsl: { object: key, element: key } }]]
        : [],
    ),
  );
  return [...links, ...SceneHandler.read(nodes).scene.objects];
};

/** A canvas's open Layout2D as an SVG file, drawn by the diagram renderer every other drawing format exports through. */
export const canvasSvg = (canvas: Canvas.Canvas): string => SvgFile.toSvgFile(openViewWorld(canvas));
