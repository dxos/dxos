//
// Copyright 2025 DXOS.org
//

import { meta } from '#meta';

export const CODE_PROJECTS_SECTION_TYPE = `${meta.profile.key}.code-projects-section`;
export const CODE_PROJECT_SPEC_TYPE = `${meta.profile.key}.code-project-spec`;
export const CODE_PROJECT_BUILD_TYPE = `${meta.profile.key}.code-project-build`;

/**
 * Graph node type for the per-plugin MDL spec child node contributed by this
 * plugin to `org.dxos.plugin` nodes (owned by `plugin-registry`). plugin-code
 * is the canonical MDL renderer, so the spec child node and matching surface
 * live here.
 */
export const PLUGIN_SPEC_TYPE = 'org.dxos.plugin.spec';

/** Registry key of the built-in introspect-mcp server behind the Coder skill. */
export const INTROSPECT_MCP_KEY = 'org.dxos.mcp.introspect';

/**
 * The introspect-mcp server, whose tools (list_packages, get_package, list_symbols, find_symbol,
 * get_symbol) look up DXOS and Composer APIs. Addressed through the EDGE entrypoint, like every
 * other service; a built-in server has no access to the client config, so the environment is pinned here.
 * TODO(burdon): Make configurable via plugin Settings.
 */
export const INTROSPECT_MCP_ENDPOINT = { url: 'https://dxos.network/introspect/mcp', protocol: 'http' } as const;
