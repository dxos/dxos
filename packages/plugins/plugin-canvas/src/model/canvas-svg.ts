//
// Copyright 2026 DXOS.org
//

import { type ReadWorldObject, SvgFile } from '@dxos/diagram';

import { type Canvas } from '#types';

import { CanvasLayoutBuilder } from './canvas-content.ts';

/** The diagram a canvas's open Layout2D draws, as the command protocol's world objects. */
export const canvasWorld = (canvas: Canvas.Canvas): ReadWorldObject[] => CanvasLayoutBuilder.read(canvas).scene.objects;

/** A canvas's open Layout2D as an SVG file, drawn by the diagram renderer every other drawing format exports through. */
export const canvasSvg = (canvas: Canvas.Canvas): string => SvgFile.toSvgFile(canvasWorld(canvas));
