//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/** A plugin preview image with optional theme-specific URLs (`light` / `dark`). */
export const Screenshot = Schema.Struct({
  light: Schema.optional(Schema.String),
  dark: Schema.optional(Schema.String),
});
export type Screenshot = Schema.Schema.Type<typeof Screenshot>;

/** Icon reference: Phosphor icon key with an optional theme hue. */
export const Icon = Schema.Struct({
  key: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  hue: Schema.optional(Schema.String),
});
export type Icon = Schema.Schema.Type<typeof Icon>;

export const Plugin = Schema.Struct({
  /** Reverse-domain NSID — the plugin's globally-unique key (e.g. `org.dxos.plugin.excalidraw`). */
  key: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  name: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  description: Schema.optional(Schema.String),
  /**
   * Author or organization name. Only used for bundled plugins. For plugins published to the
   * registry this field is ignored — the verified publisher (handle ?? did) is used instead.
   */
  author: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  screenshots: Schema.optional(Schema.Array(Screenshot)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  icon: Schema.optional(Icon),
  spec: Schema.optional(Schema.String),
  /** Composer plugin ids this plugin depends on at runtime (NSIDs). */
  dependsOn: Schema.optional(Schema.Array(Schema.String)),
});
export type Plugin = Schema.Schema.Type<typeof Plugin>;

/**
 * Publish orchestration for `dx registry publish`: build command, output directory, and optional
 * hosting override. All three are consumed together — they are a single workflow, not separate concerns.
 */
export const Publish = Schema.Struct({
  buildCommand: Schema.optional(Schema.String),
  outputDirectory: Schema.optional(Schema.String),
  assetBaseUrl: Schema.optional(Schema.String),
});
export type Publish = Schema.Schema.Type<typeof Publish>;

/**
 * The `dx.config.ts` schema: the TypeScript-authored replacement for the
 * plugin section of `dx.yml`. v1 carries one plugin's self-declared `meta` plus optional publish
 * orchestration; it will grow to absorb the rest of the (currently proto-based) config over time and
 * eventually become the canonical config.
 */
export const Config = Schema.Struct({
  plugin: Plugin,
  publish: Schema.optional(Publish),
});
export type Config = Schema.Schema.Type<typeof Config>;

/** Identity helper: authors a typed `dx.config.ts`. Validation runs at load time, not here. */
export const make = (config: Config): Config => config;

//
// Serializable plugin entrypoints (`dxplugin.jsonc`).
//

/**
 * Reference to a capability by its NSID; a bare string names a `multi` capability, the default
 * arity. Arity travels with the reference because the plugin manager orders modules by it before
 * any module body loads.
 */
export const CapabilityRef = Schema.Union([
  Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  Schema.Struct({
    id: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
    arity: Schema.Literals(['single', 'multi']),
  }),
]);
export type CapabilityRef = Schema.Schema.Type<typeof CapabilityRef>;

/** A single activation event: an NSID, optionally narrowed by a specifier (e.g. a surface role). */
export const ActivationEventRef = Schema.Union([
  Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  Schema.Struct({
    id: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
    specifier: Schema.optional(Schema.String),
  }),
]);
export type ActivationEventRef = Schema.Schema.Type<typeof ActivationEventRef>;

/**
 * When a module activates. Mirrors the runtime `ActivationEvent.Events` union — a single event,
 * `oneOf` (any fires it) or `allOf` (all must fire) — with the runtime's tagged-union
 * discriminator replaced by the key itself, which reads better hand-written.
 */
export const ActivationRef = Schema.Union([
  ActivationEventRef,
  Schema.Struct({ oneOf: Schema.Array(ActivationEventRef) }),
  Schema.Struct({ allOf: Schema.Array(ActivationEventRef) }),
]);
export type ActivationRef = Schema.Schema.Type<typeof ActivationRef>;

/** Platforms a module is loadable on; a module with no `platforms` loads everywhere. */
export const Platform = Schema.Literals(['browser', 'node', 'workerd']);
export type Platform = Schema.Schema.Type<typeof Platform>;

/**
 * One module of a plugin, as declared in `dxplugin.jsonc`.
 *
 * `src` is a URL relative to the descriptor, resolved against it at load time. The file it names
 * default-exports the module body — `(props) => Effect<…>` — so a module body is identical whether
 * it is reached through a descriptor or through `Capability.lazyModule`.
 */
export const Module = Schema.Struct({
  /** Module name, unique within the plugin; the plugin key is prefixed to form the module id. */
  id: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  /** Relative URL of the module body, resolved against the descriptor's own URL. */
  src: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  /** Activates on this event instead of during the dependency pass. */
  activatesOn: Schema.optional(ActivationRef),
  requires: Schema.optional(Schema.Array(CapabilityRef)),
  provides: Schema.optional(Schema.Array(CapabilityRef)),
  /**
   * Restricts the module to these platforms. Replaces the hand-written `plugin.node.ts` /
   * `plugin.workerd.ts` entrypoint variants: one descriptor, filtered by the loading host.
   */
  platforms: Schema.optional(Schema.Array(Platform)),
});
export type Module = Schema.Schema.Type<typeof Module>;

/**
 * The `dxplugin.jsonc` schema — a plugin's whole entrypoint as data: the same metadata
 * `dx.config.ts` carried, plus the module list that `plugin.tsx` used to express in code.
 *
 * Published as `<package>/dxplugin.jsonc` so a host can read a plugin's modules, activation waves
 * and capability graph without evaluating any of the plugin's code.
 */
export const Descriptor = Schema.Struct({
  /**
   * JSON Schema the file is authored against, for editor completion and validation. Declared on
   * the schema rather than tolerated as an excess key so the contract is explicit and a descriptor
   * round-trips through decode/encode without losing it.
   */
  $schema: Schema.optional(Schema.String),
  ...Plugin.fields,
  /** Plugin version (semver); optional for workspace plugins, whose version comes from the build. */
  version: Schema.optional(Schema.String),
  modules: Schema.Array(Module),
});
export type Descriptor = Schema.Schema.Type<typeof Descriptor>;
