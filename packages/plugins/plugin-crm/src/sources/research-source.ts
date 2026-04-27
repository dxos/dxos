//
// Copyright 2026 DXOS.org
//

import { type Operation } from '@dxos/operation';

/**
 * Pluggable contract for augmenting the CRM blueprint with additional
 * research sources (e.g. a LinkedIn browser-extension integration shipped
 * by composer-crx). v1 defines the contract only — no implementations ship
 * with plugin-crm. The CRM blueprint iterates over registered sources when
 * building its tool list so that the agent has access to their tools
 * whenever the source is available.
 */
export interface ResearchSource {
  /** Stable identifier, e.g. `linkedin-crx`. */
  readonly id: string;

  /** Human-readable description; surfaced in blueprint instructions. */
  readonly description: string;

  /** Operations contributed to the CRM blueprint by this source. */
  readonly operations?: ReadonlyArray<Operation.Definition.Any>;

  /** Native tool identifiers (e.g. provider-native tools) contributed by this source. */
  readonly tools?: ReadonlyArray<string>;
}

/**
 * Registry of ResearchSource contributions available to the CRM blueprint.
 * v1 exports an empty registry. Future work will add a capability-based
 * registration mechanism so plugins (e.g. composer-crx) can register their
 * own sources.
 */
export const defaultResearchSources: ReadonlyArray<ResearchSource> = [];
