//
// Copyright 2026 DXOS.org
//

import { type Planet, type TerraConfigValues, generatePlanet } from './generate-planet';

/**
 * Retention budget across all cached planets. Generation is deterministic in the config, so a
 * planet is safe to reuse indefinitely — the only cost is memory, and it is substantial: the
 * triangle-soup mesh is ~94MB at the default resolution of 256 and ~377MB at 512. The budget keeps
 * the working set (the current planet plus the one the user just came from) resident while
 * bounding what a long session can accumulate.
 */
const DEFAULT_MAX_BYTES = 256 * 1024 * 1024;

const planetBytes = (planet: Planet): number =>
  planet.mesh.positions.byteLength + planet.mesh.normals.byteLength + planet.mesh.colors.byteLength;

/**
 * A stable key over all config values. `generatePlanet` is deterministic in exactly these values,
 * so equal keys imply an identical planet; entries are sorted because config objects reach here
 * from different merge orders (defaults, stored config, form patches).
 */
export const planetKey = (config: TerraConfigValues): string =>
  JSON.stringify(Object.entries(config).sort(([left], [right]) => left.localeCompare(right)));

export type PlanetCacheOptions = {
  maxBytes?: number;
};

/**
 * Caches generated planets by config, so remounting the article (a resize, opening the companion,
 * navigating back) re-renders the existing mesh instead of paying the multi-second rebuild. Held
 * outside the React tree — see `TerraCapabilities.PlanetCache`.
 */
export class PlanetCache {
  // Iteration order is the LRU order (least-recent first); `resolve` re-inserts on a hit to move the entry to the end.
  readonly #entries = new Map<string, { planet: Planet; bytes: number }>();
  readonly #maxBytes: number;
  #bytes = 0;
  #hits = 0;
  #misses = 0;

  constructor({ maxBytes = DEFAULT_MAX_BYTES }: PlanetCacheOptions = {}) {
    this.#maxBytes = maxBytes;
  }

  get size(): number {
    return this.#entries.size;
  }

  get bytes(): number {
    return this.#bytes;
  }

  /** Planets served without generating; with {@link misses}, what a story or debug panel reports to show the cache is working. */
  get hits(): number {
    return this.#hits;
  }

  /** Planets that had to be generated. */
  get misses(): number {
    return this.#misses;
  }

  /** Whether {@link resolve} would return without generating — lets callers skip debouncing work that costs nothing. */
  has(config: TerraConfigValues): boolean {
    return this.#entries.has(planetKey(config));
  }

  /** The planet for `config`, generating and retaining it on a miss. */
  resolve(config: TerraConfigValues): Planet {
    const key = planetKey(config);
    const entry = this.#entries.get(key);
    if (entry) {
      this.#hits++;
      this.#entries.delete(key);
      this.#entries.set(key, entry);
      return entry.planet;
    }

    this.#misses++;
    const planet = generatePlanet(config);
    const bytes = planetBytes(planet);
    this.#entries.set(key, { planet, bytes });
    this.#bytes += bytes;
    this.#evict();
    return planet;
  }

  clear(): void {
    this.#entries.clear();
    this.#bytes = 0;
    this.#hits = 0;
    this.#misses = 0;
  }

  /** Drops least-recently-used entries down to the budget, always keeping the newest — a single planet may exceed it on its own. */
  #evict(): void {
    for (const [key, entry] of this.#entries) {
      if (this.#bytes <= this.#maxBytes || this.#entries.size <= 1) {
        return;
      }
      this.#entries.delete(key);
      this.#bytes -= entry.bytes;
    }
  }
}
