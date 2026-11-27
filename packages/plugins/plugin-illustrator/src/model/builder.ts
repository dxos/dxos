//
// Copyright 2026 DXOS.org
//

//
// Renderer-neutral builder contract: each variant (tldraw, excalidraw, …) implements
// `DrawingBuilder` to compile the scene DSL onto its canvas records and derive the scene back
// from them. Implementations are contributed via `IllustratorCapabilities.VariantProvider`.
//

import {
  type ApplyResult,
  type ContentHandler,
  type ContentMap,
  type ReadResult,
  type Scene,
  SVG_SCHEMA,
  SvgHandler,
  applyCommands,
} from '@dxos/diagram';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { upgradeShape } from '@dxos/scene';

import * as Drawing from '../types/Drawing.ts';

/**
 * Maps the scene DSL onto a canvas. Geometry is derived from the live records — not a stored
 * copy — so the model stays coherent after users drag or resize shapes in the renderer's UI.
 */
export type DrawingBuilder = {
  /** Renderer dialect this builder handles; matched against `Canvas.schema`. */
  readonly schema: string;
  /** Derive the neutral scene from the canvas, which is of the builder's variant. */
  read: (canvas: Obj.Unknown) => ReadResult;
  /** Apply a batch of edit commands atomically. */
  apply: (canvas: Obj.Unknown, commands: readonly Scene.Command[]) => ApplyResult;
};

/**
 * Builds a {@link DrawingBuilder} from the renderer's {@link ContentHandler}, so a variant only
 * supplies its record encoding and inherits the ECHO write semantics and command bookkeeping.
 */
export const makeBuilder = ({ schema, handler }: { schema: string; handler: ContentHandler }): DrawingBuilder => ({
  schema,
  read: (canvas) => {
    invariant(Obj.instanceOf(Drawing.Canvas, canvas));
    return handler.read(canvas.content);
  },
  apply: (canvas, commands) => {
    invariant(Obj.instanceOf(Drawing.Canvas, canvas));
    let result: ApplyResult = { upserted: [], removed: 0 };
    Obj.update(canvas, (canvas) => {
      result = applyCommands(canvas.content as ContentMap, commands, handler);
    });
    return result;
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether a stored diagram element states an outline as a `border` flag, or its component as `type`. */
const isLegacyShape = (shape: unknown): shape is Record<string, unknown> =>
  isRecord(shape) && (shape.border !== undefined || shape.type !== undefined);

/** A stored record with its element in the current words. */
const upgradeSvgRecord = (record: unknown): unknown =>
  isRecord(record) && isLegacyShape(record.data) ? { ...record, data: upgradeShape(record.data) } : record;

/**
 * An SVG canvas's content with every element in the current words, so one stored in the earlier words (in ECHO, or
 * in a `.dx.svg`) draws as it did. Content already in them is returned as it is.
 */
export const upgradeSvgContent = (content: ContentMap): ContentMap =>
  Object.values(content).some((record) => isRecord(record) && isLegacyShape(record.data))
    ? Object.fromEntries(Object.entries(content).map(([id, record]) => [id, upgradeSvgRecord(record)]))
    : content;

/** `SvgHandler` over stored content of any revision. */
export const SvgContentHandler: ContentHandler = {
  ...SvgHandler,
  read: (content) => SvgHandler.read(upgradeSvgContent(content)),
};

/** Scene builder for the SVG variant — a peer of `TldrawBuilder`. */
export const SvgBuilder = makeBuilder({ schema: SVG_SCHEMA, handler: SvgContentHandler });
