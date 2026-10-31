//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';
import type { ComponentType } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { SVG_SCHEMA } from '@dxos/diagram';
import { type Database, Obj, type Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { type DrawingBuilder } from '#model';

import { IllustratorNamespace } from '../namespace.ts';
import * as Drawing from './Drawing.ts';

/**
 * A drawing variant contribution. Each renderer plugin (tldraw, excalidraw, ...) contributes one
 * via `Capability.contribute(IllustratorCapabilities.VariantProvider, variant)`.
 * Consumers iterate via `Capability.getAll(IllustratorCapabilities.VariantProvider)` (Effect) or
 * `useCapabilities(IllustratorCapabilities.VariantProvider)` (React).
 */
export const VariantProvider = Capability.make<DrawingVariant>()(`${IllustratorNamespace.key}.capability.variant`);

/** What every variant contributes, whatever its canvas type. */
type VariantBase = {
  /** Renderer dialect claimed by this variant; matched against `Canvas.schema` (e.g. 'tldraw.com/2'). */
  id: string;
  /** Human-readable variant name (e.g. 'tldraw'). */
  label: string;
  /** Optional Phosphor icon name (e.g. 'ph--compass-tool--regular'). */
  icon?: string;
  /** Maps the scene DSL onto this variant's canvas. */
  builder: DrawingBuilder;
  /**
   * Renders drawings it matches but is never created or converted to: a format a newer variant of the same plugin
   * replaces, kept so its drawings still open (and migrate).
   */
  hidden?: boolean;
  /** Offered when creating a drawing but never as a conversion target: it differs from another variant only in what it creates. */
  createOnly?: boolean;
  /** Whether this canvas can be copied as another variant; unset, any can. A 3D canvas has nothing 2D to copy. */
  convertible?: (canvas: Obj.Unknown) => boolean;
};

/** A variant storing its content in the base `Drawing.Canvas`, matched by `schema` (tldraw, excalidraw, svg). */
export type CanvasVariant = VariantBase & {
  canvasType?: undefined;
  /** Build an empty canvas. Defaults to a base `Drawing.Canvas` stamped with `id` as its schema. */
  createCanvas?: (input?: Record<string, any>) => Effect.Effect<Drawing.Canvas, Error, Database.Service>;
  /** Optional Card surface component for this variant. */
  card?: ComponentType<DrawingVariantSurfaceProps>;
  /** Optional Article/Section/Slide surface component for this variant. */
  article?: ComponentType<DrawingVariantSurfaceProps>;
};

/** A variant with a canvas type of its own, matched by that type rather than by `schema`. */
export type TypedCanvasVariant = VariantBase & {
  /** The canvas object type a drawing of this variant references. */
  canvasType: Type.AnyObj;
  createCanvas: (input?: Record<string, any>) => Effect.Effect<Obj.Unknown, Error, Database.Service>;
  /** Removes a canvas of this type with the objects it owns; a conversion that replaces it calls this. */
  removeCanvas?: (canvas: Obj.Unknown) => Effect.Effect<void, never, Database.Service>;
  card?: ComponentType<DrawingVariantSurfaceProps<Obj.Unknown>>;
  article?: ComponentType<DrawingVariantSurfaceProps<Obj.Unknown>>;
};

/**
 * Contribution from a renderer plugin (e.g. plugin-tldraw, plugin-excalidraw).
 * Defines how a drawing variant is created, rendered, and how the scene DSL maps onto it.
 */
export type DrawingVariant = CanvasVariant | TypedCanvasVariant;

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
  /** Builds a new canvas of the target variant from the source canvas (of the source variant), which it leaves unchanged. */
  convert: (
    source: Obj.Unknown,
    variants: { from: DrawingVariant; to: DrawingVariant },
  ) => Effect.Effect<ConvertedCanvas, Error, Database.Service | Capability.Service>;
};

/** A converter's result: the new canvas (of the target variant's type), and the scene object ids written to it. */
export type ConvertedCanvas = { canvas: Obj.Unknown; upserted: readonly string[] };

export type DrawingVariantSurfaceProps<C extends Obj.Unknown = Drawing.Canvas> = {
  /** The base Drawing object (may be a snapshot from useObject/Surface). */
  drawing: Obj.Snapshot<Drawing.Drawing> | Drawing.Drawing;
  /** The resolved LIVE canvas object — variant store adapters need `Doc.createAccessor`. */
  canvas: C;
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
  /** The user changed the selection. Ids are scene object ids — never renderer shape ids. */
  onSelectionChange?: (objectIds: readonly string[]) => void;
  /** The user activated an object (double-click / enter): open what it depicts. */
  onActivate?: (objectId: string) => void;
};

/**
 * The variant that renders `canvas`: the one whose `canvasType` it is, else, for a base `Drawing.Canvas`, the one
 * claiming its `schema` by format (a canvas stored at an older revision stays with its variant until migrated).
 * Undefined for a canvas no installed variant claims, such as one a newer client migrated to its own type.
 */
export const variantFor = (
  canvas: Obj.Unknown | undefined,
  variants: readonly DrawingVariant[],
): DrawingVariant | undefined => {
  if (!canvas) {
    return undefined;
  }
  const typed = variants.find(
    (variant) => variant.canvasType !== undefined && Obj.instanceOf(variant.canvasType, canvas),
  );
  if (typed || !Drawing.isCanvas(canvas)) {
    return typed;
  }
  const schema = canvas.schema ?? '';
  return variants.find((variant) => variant.canvasType === undefined && Drawing.isSameFormat(variant.id, schema));
};

/** Variant label as an id segment: variant ids carry `.` and `/`, which graph node ids reserve. */
export const variantSlug = (variant: Pick<DrawingVariant, 'label'>): string =>
  variant.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The variants a drawing on `schema` can be converted to for editing; the SVG variant is a read-only viewer. */
export const editTargets = (variants: readonly DrawingVariant[], schema: string | undefined): DrawingVariant[] =>
  variants.filter(({ id, hidden, createOnly }) => id !== schema && id !== SVG_SCHEMA && !hidden && !createOnly);

/** The variants a drawing's `canvas` can be copied as: none when its own variant cannot copy it. */
export const convertTargets = (
  canvas: Obj.Unknown | undefined,
  variants: readonly DrawingVariant[],
): DrawingVariant[] => {
  const from = variantFor(canvas, variants);
  return !from || !canvas || from.convertible?.(canvas) === false ? [] : editTargets(variants, from.id);
};

/** The variant drawings of `id` are created and converted as: the one that is not hidden. */
export const findVariant = (variants: readonly DrawingVariant[], id: string): DrawingVariant | undefined =>
  variants.find((variant) => variant.id === id && !variant.hidden);

/** The "Copy as …" label of the action converting a copy of a drawing to `variant`, keyed per variant so known ones translate. */
export const copyLabel = (variant: Pick<DrawingVariant, 'label'>): Theme.Label => [
  `copy-as-${variantSlug(variant)}.label`,
  { ns: IllustratorNamespace.key, defaultValue: `Copy as ${variant.label}` },
];

/** The "Edit in …" label of the action converting a drawing to `variant`, keyed per variant so known ones translate. */
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
