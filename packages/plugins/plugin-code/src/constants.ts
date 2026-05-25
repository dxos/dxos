//
// Copyright 2025 DXOS.org
//

import { meta } from '#meta';

export const CODE_PROJECTS_SECTION_TYPE = `${meta.id}.code-projects-section`;
export const CODE_PROJECT_SPEC_TYPE = `${meta.id}.code-project-spec`;
export const CODE_PROJECT_BUILD_TYPE = `${meta.id}.code-project-build`;

/**
 * Graph node type for the per-plugin MDL spec child node contributed by this
 * plugin to `org.dxos.plugin` nodes (owned by `plugin-registry`). plugin-code
 * is the canonical MDL renderer, so the spec child node and matching surface
 * live here.
 */
export const PLUGIN_SPEC_TYPE = 'org.dxos.plugin.spec';
