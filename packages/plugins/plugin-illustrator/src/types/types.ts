//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type { ComponentType } from 'react';

import type { Database, Obj, Type } from '@dxos/echo';

import { type SketchBuilder } from '#model';

import type * as Sketch from './Sketch';

/**
 * Contribution from a canvas renderer plugin (e.g. plugin-tldraw, plugin-excalidraw).
 * Defines how a sketch variant is created, rendered, and how the scene DSL maps onto it.
 */
export type SketchVariant = {
  /** Stable id, typically the canvas typename (e.g. 'org.dxos.type.canvas'). */
  id: string;
  /** Human-readable variant name (e.g. 'tldraw'). */
  label: string;
  /** Optional Phosphor icon name (e.g. 'ph--compass-tool--regular'). */
  icon?: string;
  /** ECHO Type entity of the canvas object referenced by `Sketch.canvas`. */
  canvasType: Type.AnyObj;
  /**
   * Build an empty canvas object. May allocate ECHO objects, run effects, etc.
   * Returned object is added to the database alongside the Sketch.
   */
  createCanvas: (input?: Record<string, any>) => Effect.Effect<Obj.Any, Error, Database.Service>;
  /** Maps the scene DSL onto this variant's canvas records. */
  builder: SketchBuilder;
  /** Optional Card surface component for this variant. */
  card?: ComponentType<SketchVariantSurfaceProps>;
  /** Optional Article/Section/Slide surface component for this variant. */
  article?: ComponentType<SketchVariantSurfaceProps>;
};

export type SketchVariantSurfaceProps = {
  /** The base Sketch object (may be a snapshot from useObject/Surface). */
  sketch: Obj.Snapshot<Sketch.Sketch> | Sketch.Sketch;
  /** The resolved LIVE canvas object — variant store adapters need `Doc.createAccessor`. */
  canvas: Obj.Unknown;
  /** Surface role passed through from the host. */
  role?: string;
  /** Attendable id passed through from the host. */
  attendableId?: string;
  /** Card surfaces: whether the card is editable. */
  editable?: boolean;
  /** Section surfaces: whether the embed is extrinsically sized. */
  extrinsic?: boolean;
};
