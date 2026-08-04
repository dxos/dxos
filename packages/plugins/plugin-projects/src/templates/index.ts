//
// Copyright 2026 DXOS.org
//

import { ProjectCapabilities } from '#types';

import { blank } from './blank';
import { inboxResearch } from './inbox-research';

export * from './inbox-research';
export * from './scaffold';

/**
 * Templates contributed by plugin-projects itself. `inboxResearch` lives here rather than in
 * plugin-inbox because plugin-inbox is publishable and this plugin is private — a public package
 * cannot depend on a private one (`check-public-dependencies`); revisit when this plugin publishes.
 */
export { blank };

export const defaultTemplates: ProjectCapabilities.Template[] = [blank, inboxResearch];
