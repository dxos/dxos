//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { DXN } from '@dxos/keys';

/**
 * A model provider: who serves models. The id is a DXN so the set is open — third-party providers
 * are defined under their own reverse-DNS id, and the provider itself is pure metadata (its models
 * are the catalog entries that name it; see {@link Model.forProvider}).
 */
export type Provider = {
  /** Provider identity (a DXN). */
  readonly id: DXN.DXN;
  /** Display label. */
  readonly label: string;
  /** Default base URL (omitted for `edge`, which is reached via the identity-aware edge client). */
  readonly endpoint?: string;
  /** True for a bundled provider whose lifecycle the app manages (the local sidecar). */
  readonly managed?: boolean;
};

type MakeOptions = Omit<Provider, 'id'>;

/**
 * Constructs a provider from its NSID. The NSID is validated at compile time (its final segment must
 * be camelCase — no hyphens) and at runtime, mirroring {@link DXN.make}.
 */
export const make: {
  <Id extends string>(
    nsid: [DXN.Name<Id>] extends [never] ? `Invalid NSID "${Id}": final segment must be camelCase (no hyphens)` : Id,
    options: MakeOptions,
  ): Provider;
} = (nsid: string, options: MakeOptions): Provider => ({ id: DXN.make(nsid), ...options });

/** Anthropic Claude (and other cloud models) via the DXOS edge intermediary. */
export const edge = make('org.dxos.provider.edge', { label: 'Edge' });

/** The bundled, managed local sidecar (currently Ollama). */
export const builtIn = make('org.dxos.provider.builtIn', {
  label: 'Built-in',
  endpoint: 'http://localhost:21434',
  managed: true,
});

/** An external, user-run Ollama server. */
export const ollama = make('org.dxos.provider.ollama', { label: 'Ollama', endpoint: 'http://localhost:11434' });

/** An external LM Studio server (OpenAI-compatible). */
export const lmStudio = make('org.dxos.provider.lmStudio', { label: 'LM Studio', endpoint: 'http://localhost:1234' });

// TODO(wittjosiah): Remove.
export const openai = make('org.dxos.provider.openai', { label: 'OpenAI' });

/** All providers DXOS defines. The supported set is derived from this list, not a closed union. */
export const all: readonly Provider[] = [edge, builtIn, ollama, lmStudio, openai];

/** Look up a provider by its DXN id. */
export const get = (id: DXN.DXN): Provider | undefined => all.find((provider) => provider.id === id);
