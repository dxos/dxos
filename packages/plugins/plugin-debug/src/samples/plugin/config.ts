//
// Copyright 2026 DXOS.org
//

import type * as Feature from '@dxos/plugin-projects/Feature';
import type * as Templates from '@dxos/plugin-projects/Templates';

/** What the build of Composer a space is created in was built from, and the EDGE it publishes to. */
export type Toolchain = { toolchain: Templates.PluginToolchain; edgeUrl: string };

export type FeatureSeed = {
  readonly name: string;
  readonly description: string;
  /** The spec block it is described by; F-1 is seeded, the agent writes the rest. */
  readonly feat: string;
  readonly subfeatures?: readonly Feature.Subfeature[];
  /** Indexes into the template's task list. */
  readonly tasks: readonly number[];
};

/**
 * One Composer plugin seeded as a plan for the agent to finish: everything that differs between two plugin templates.
 * The run around it (complete the spec, draw it, plan the work as tasks, build in a sandbox on EDGE, publish to the
 * private registry) is the same for every plugin.
 */
export type Config = {
  /** The space template's id. */
  readonly id: string;
  /** The created space; `icon` is an `iconValues` name. */
  readonly space: { readonly name: string; readonly icon: string; readonly hue: string };
  /** The template's line in the create-space dialog. */
  readonly description: string;
  /** The plugin's display name, which also names the project, its spec and the sandbox it is built in. */
  readonly name: string;
  /** The plugin's npm package name. */
  readonly npmName: string;
  /** The `@dxos/*` packages the plugin imports; everything else comes from npm. */
  readonly packages: readonly string[];
  /** One sentence for the project's description. */
  readonly summary: string;
  /** The partial spec in Deus, and the repo-style path its features cite. */
  readonly spec: { readonly content: string; readonly path: string };
  /** One per `feat` block the finished spec will have; the first is written, the rest only named. */
  readonly features: readonly FeatureSeed[];
  /** What the spec task asks the agent to write: the features it names and the facts each must carry. */
  readonly completeSpec: string;
  /** What the plugin shows once installed, as the diagram names it (`its Board page in a space`). */
  readonly shows: string;
  /** Plugin-specific facts the brief carries: guide sections to read, its data model, its dependencies. */
  readonly brief: readonly string[];
};
