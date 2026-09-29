//
// Copyright 2026 DXOS.org
//

import { ProjectCapabilities } from '#types';

import { composerPlugin } from './composer-plugin.ts';
import { defaultTemplate } from './default.ts';
import { inboxResearch } from './inbox-research.ts';

export * from './composer-plugin.ts';
export * from './inbox-research.ts';
export * from './scaffold.ts';

/**
 * Templates contributed by plugin-projects itself. `inboxResearch` lives here rather than in
 * plugin-inbox because plugin-inbox is publishable and this plugin is private — a public package
 * cannot depend on a private one (`check-public-dependencies`); revisit when this plugin publishes.
 */
export { defaultTemplate };

/** The Composer Plugin template joins them only where it can run (see {@link composerPlugin}). */
export const defaultTemplates: ProjectCapabilities.Template[] = [
  defaultTemplate,
  inboxResearch,
  ...[composerPlugin()].filter((template) => template !== undefined),
];
