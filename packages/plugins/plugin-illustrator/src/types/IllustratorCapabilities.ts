//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import type { ComponentType } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import type { Database, Obj, Type } from '@dxos/echo';

import { meta } from '#meta';
import { type DrawingBuilder } from '#model';

import type * as Drawing from './Drawing.ts';

/**
 * A drawing variant contribution. Each renderer plugin (tldraw, excalidraw, ...) contributes one
 * via `Capability.contribute(IllustratorCapabilities.VariantProvider, variant)`.
 * Consumers iterate via `Capability.getAll(IllustratorCapabilities.VariantProvider)` (Effect) or
 * `useCapabilities(IllustratorCapabilities.VariantProvider)` (React).
 */
export const VariantProvider = Capability.make<DrawingVariant>()(`${meta.profile.key}.capability.variant`);

/**
 * Contribution from a renderer plugin (e.g. plugin-tldraw, plugin-excalidraw).
 * Defines how a drawing variant is created, rendered, and how the scene DSL maps onto it.
 */
export type DrawingVariant = {
  /** Renderer dialect claimed by this variant; matched against `Canvas.schema` (e.g. 'tldraw.com/2'). */
  id: string;
  /** Human-readable variant name (e.g. 'tldraw'). */
  label: string;
  /** Optional Phosphor icon name (e.g. 'ph--compass-tool--regular'). */
  icon?: string;
  /**
   * Canvas type, when the renderer extends the base `Drawing.Canvas` with its own fields.
   * Omit to use the base type — the common case, since `schema` already discriminates.
   */
  canvasType?: Type.AnyObj;
  /** Build an empty canvas. Defaults to a base `Drawing.Canvas` stamped with `id` as its schema. */
  createCanvas?: (input?: Record<string, any>) => Effect.Effect<Drawing.Canvas, Error, Database.Service>;
  /** Maps the scene DSL onto this variant's canvas records. */
  builder: DrawingBuilder;
  /** Optional Card surface component for this variant. */
  card?: ComponentType<DrawingVariantSurfaceProps>;
  /** Optional Article/Section/Slide surface component for this variant. */
  article?: ComponentType<DrawingVariantSurfaceProps>;
};

export type DrawingVariantSurfaceProps = {
  /** The base Drawing object (may be a snapshot from useObject/Surface). */
  drawing: Obj.Snapshot<Drawing.Drawing> | Drawing.Drawing;
  /** The resolved LIVE canvas object — variant store adapters need `Doc.createAccessor`. */
  canvas: Drawing.Canvas;
  /** Surface role passed through from the host. */
  role?: string;
  /** Attendable id passed through from the host. */
  attendableId?: string;
  /** Card surfaces: whether the card is editable. */
  editable?: boolean;
  /** Section surfaces: whether the embed is extrinsically sized. */
  extrinsic?: boolean;
};
