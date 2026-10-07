//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import type { ComponentType } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import type { Database, Obj, Type } from '@dxos/echo';

import { meta } from '#meta';

import * as Game from './Game.ts';

/**
 * A game variant contribution. Each variant plugin (chess, tic-tac-toe, ...)
 * contributes one of these via `Capability.contribute(GameCapabilities.VariantProvider, variant)`.
 * Multi capability: more than one variant plugin provides it. Consumers iterate via
 * `Capability.getAll(GameCapabilities.VariantProvider)` (Effect) or
 * `useCapabilities(GameCapabilities.VariantProvider)` (React).
 */
export const VariantProvider = Capability.make<GameVariant>()(`${meta.profile.key}.capability.variant`);

/**
 * Contribution from a variant plugin (e.g. plugin-chess).
 * Defines how a game variant is created, rendered, and the roles its players take.
 */
export type GameVariant = {
  /** Stable id, typically the variant state typename (e.g. 'org.dxos.type.chess.state'). */
  id: string;
  /** Human-readable variant name (e.g. 'Chess'). */
  label: string;
  /** Optional Phosphor icon name (e.g. 'ph--shield-chevron--regular'). */
  icon?: string;
  /** ECHO Type entity of the variant state object referenced by `Game.variant`. */
  variantType: Type.AnyObj;
  /**
   * Optional Effect Schema rendered as a form after the user picks the variant.
   * To use a `Type.Type` entity, extract its schema first via `Type.getSchema(...)`.
   */
  inputSchema?: Schema.Codec<any, any>;
  /** Roles a player may take in this variant (e.g. ['white', 'black']). */
  roles: readonly string[];
  /**
   * Build the variant state object from the user's form input. May allocate ECHO
   * objects, run effects, etc. Returned object is added to the database alongside the Game.
   */
  createVariant: (input: Record<string, any>) => Effect.Effect<Obj.Any, Error, Database.Service>;
  /** Optional Card surface component for this variant. */
  card?: ComponentType<GameVariantSurfaceProps>;
  /** Optional Article/Section surface component for this variant. */
  article?: ComponentType<GameVariantSurfaceProps>;
};

export type GameVariantSurfaceProps = {
  /** The base Game object (may be a snapshot from useObject/Surface). */
  game: Obj.Snapshot<Game.Game> | Game.Game;
  /**
   * The resolved variant state object, live rather than a snapshot so variants can write to it.
   * Reads must subscribe via `useObject(variant, prop)` — the host re-renders only when the ref
   * resolves, not on every mutation.
   */
  variant: Obj.Unknown;
  /** Surface role passed through from the host. */
  role?: string;
  /** Attendable id passed through from the host. */
  attendableId?: string;
};
