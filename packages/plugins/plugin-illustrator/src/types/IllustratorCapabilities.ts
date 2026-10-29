//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';
import type { ComponentType } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { SVG_SCHEMA } from '@dxos/diagram';
import type { Database, Obj, Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { type DrawingBuilder } from '#model';

import { IllustratorNamespace } from '../namespace.ts';
import type * as Drawing from './Drawing.ts';

/**
 * A drawing variant contribution. Each renderer plugin (tldraw, excalidraw, ...) contributes one
 * via `Capability.contribute(IllustratorCapabilities.VariantProvider, variant)`.
 * Consumers iterate via `Capability.getAll(IllustratorCapabilities.VariantProvider)` (Effect) or
 * `useCapabilities(IllustratorCapabilities.VariantProvider)` (React).
 */
export const VariantProvider = Capability.make<DrawingVariant>()(`${IllustratorNamespace.key}.capability.variant`);

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
   * Omit to use the base type - the common case, since `schema` already discriminates.
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

/**
 * A conversion between two drawing variants, contributed by a plugin that converts better than the generic scene
 * replay `DrawingOperation.Convert` falls back to (e.g. one that also maps shapes the scene DSL cannot carry).
 */
export const Converter = Capability.make<DrawingConverter>()(`${IllustratorNamespace.key}.capability.converter`);

export type DrawingConverter = {
  /** The source variant id (`Canvas.schema`). */
  from: string;
  /** The target variant id. */
  to: string;
  /** Builds a new canvas of the target variant from the source canvas, which it leaves unchanged. */
  convert: (
    source: Drawing.Canvas,
    variants: { from: DrawingVariant; to: DrawingVariant },
  ) => Effect.Effect<ConvertedCanvas, Error, Database.Service | Capability.Service>;
};

/** A converter's result: the new canvas, and the scene object ids written to it. */
export type ConvertedCanvas = { canvas: Drawing.Canvas; upserted: readonly string[] };

export type DrawingVariantSurfaceProps = {
  /** The base Drawing object (may be a snapshot from useObject/Surface). */
  drawing: Obj.Snapshot<Drawing.Drawing> | Drawing.Drawing;
  /** The resolved LIVE canvas object - variant store adapters need `Doc.createAccessor`. */
  canvas: Drawing.Canvas;
  /** Surface role passed through from the host. */
  role?: string;
  /** Attendable id passed through from the host. */
  attendableId?: string;
  /** Card surfaces: whether the card is editable. */
  editable?: boolean;
  /** Section surfaces: whether the embed is extrinsically sized. */
  extrinsic?: boolean;
  /** Selected world-object ids, owned by the host so every renderer shares one selection model. */
  selection?: readonly string[];
  /** The user changed the selection. Ids are scene object ids - never renderer shape ids. */
  onSelectionChange?: (objectIds: readonly string[]) => void;
  /** The user activated an object (double-click / enter): open what it depicts. */
  onActivate?: (objectId: string) => void;
};

/** Variant label as an id segment: variant ids carry `.` and `/`, which graph node ids reserve. */
export const variantSlug = (variant: Pick<DrawingVariant, 'label'>): string =>
  variant.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The variants a drawing on `schema` can be converted to for editing; the SVG variant is a read-only viewer. */
export const editTargets = (variants: readonly DrawingVariant[], schema: string | undefined): DrawingVariant[] =>
  variants.filter(({ id }) => id !== schema && id !== SVG_SCHEMA);

/** The "Copy as ..." label of the action converting a copy of a drawing to `variant`, keyed per variant so known ones translate. */
export const copyLabel = (variant: Pick<DrawingVariant, 'label'>): Theme.Label => [
  `copy-as-${variantSlug(variant)}.label`,
  { ns: IllustratorNamespace.key, defaultValue: `Copy as ${variant.label}` },
];

/** The "Edit in ..." label of the action converting a drawing to `variant`, keyed per variant so known ones translate. */
export const editLabel = (variant: Pick<DrawingVariant, 'label'>): Theme.Label => [
  `edit-in-${variantSlug(variant)}.label`,
  { ns: IllustratorNamespace.key, defaultValue: `Edit in ${variant.label}` },
];

/**
 * Refit requests, a counter per canvas URI: the drawing operations an agent calls (`Draw`, `Edit`) bump it, and a
 * variant's view reframes its scene when it changes, so an edit the viewer did not make is brought into view.
 */
export const Refit = Capability.makeSingleton<Atom.Writable<Record<string, number>>>()(
  `${IllustratorNamespace.key}.capability.refit`,
);
