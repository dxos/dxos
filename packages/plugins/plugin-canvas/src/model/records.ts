//
// Copyright 2026 DXOS.org
//

import type * as Types from 'effect/Types';

import { Obj } from '@dxos/echo';
import { Scene } from '@dxos/scene';

import { type Canvas } from '#types';

/** A deep copy free of ECHO proxies, writable as a new record of an object. */
export const plain = <T>(value: T): Types.DeepMutable<T> => JSON.parse(JSON.stringify(value));

export const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export const isLayout2D = (value: unknown): value is Scene.Layout2D => Obj.instanceOf(Scene.Layout2D, value);
export const isModel2D = (value: unknown): value is Scene.Model2D => Obj.instanceOf(Scene.Model2D, value);

/** The canvas's 2D model, which holds its named styles. */
export const canvasModel2D = (canvas: Canvas.Canvas): Scene.Model2D | undefined => {
  const model = canvas.model?.target;
  return isModel2D(model) ? model : undefined;
};
