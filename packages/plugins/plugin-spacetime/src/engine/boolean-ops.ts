//
// Copyright 2026 DXOS.org
//

import type { Manifold, ManifoldToplevel } from 'manifold-3d';

import { type Model } from '../types';

/** Result of a boolean operation: the combined solid and its world position. */
export type BooleanResult = {
  /** The resulting Manifold solid (in local space relative to position). */
  solid: Manifold;
  /** World position for the result (matches the first input object). */
  position: Model.Vec3;
};

/**
 * Translates a solid from its local space to world space relative to a reference position.
 * The solid's vertices are shifted so that object positions are accounted for in the boolean.
 */
const toWorldSpace = (solid: Manifold, objectPos: Model.Vec3, refPos: Model.Vec3): Manifold => {
  const dx = objectPos.x - refPos.x;
  const dy = objectPos.y - refPos.y;
  const dz = objectPos.z - refPos.z;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6 && Math.abs(dz) < 1e-6) {
    return solid;
  }

  return solid.translate([dx, dy, dz]);
};

/**
 * Joins (unions) multiple solids into a single solid.
 * Each solid is translated to world space relative to the first object's position.
 * The result position is that of the first object.
 */
export const joinSolids = (wasm: ManifoldToplevel, solids: Manifold[], positions: Model.Vec3[]): BooleanResult => {
  if (solids.length === 0 || positions.length !== solids.length) {
    throw new Error('joinSolids requires at least one solid and matching positions array');
  }
  const refPos = positions[0];
  const translated: Manifold[] = [];
  for (let idx = 0; idx < solids.length; idx++) {
    translated.push(toWorldSpace(solids[idx], positions[idx], refPos));
  }

  let result = translated[0];
  for (let idx = 1; idx < translated.length; idx++) {
    const next = wasm.Manifold.union(result, translated[idx]);
    if (result !== translated[0]) {
      result.delete();
    }
    if (translated[idx] !== solids[idx]) {
      translated[idx].delete();
    }
    result = next;
  }

  return { solid: result, position: { ...refPos } };
};

/**
 * Subtracts solids[1..n] from solids[0] (A - B - C - ...).
 * Each solid is translated to world space relative to the first object's position.
 * The result position is that of the first object.
 */
export const subtractSolids = (wasm: ManifoldToplevel, solids: Manifold[], positions: Model.Vec3[]): BooleanResult => {
  if (solids.length === 0 || positions.length !== solids.length) {
    throw new Error('subtractSolids requires at least one solid and matching positions array');
  }
  const refPos = positions[0];
  const translated: Manifold[] = [];
  for (let idx = 0; idx < solids.length; idx++) {
    translated.push(toWorldSpace(solids[idx], positions[idx], refPos));
  }

  let result = translated[0];
  for (let idx = 1; idx < translated.length; idx++) {
    const next = wasm.Manifold.difference(result, translated[idx]);
    if (result !== translated[0]) {
      result.delete();
    }
    if (translated[idx] !== solids[idx]) {
      translated[idx].delete();
    }
    result = next;
  }

  return { solid: result, position: { ...refPos } };
};
