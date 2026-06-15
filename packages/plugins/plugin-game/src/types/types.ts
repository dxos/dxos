//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import type { ComponentType } from 'react';

import type { Database, Obj, Type } from '@dxos/echo';

import type { Game } from './Game';

/**
 * Contribution from a variant plugin (e.g. plugin-chess, plugin-tictactoe).
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
  inputSchema?: Schema.Schema.AnyNoContext;
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
  game: Obj.Snapshot<Game> | Game;
  /** The resolved variant state object (may be a snapshot from useObject). */
  variant: Obj.Snapshot<Obj.Unknown> | Obj.Unknown;
  /** Surface role passed through from the host. */
  role?: string;
  /** Attendable id passed through from the host. */
  attendableId?: string;
};
