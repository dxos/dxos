//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { CodeNamespace } from './namespace.ts';

export const CODE_PROJECTS_SECTION_TYPE = `${CodeNamespace.key}.code-projects-section`;
export const CODE_PROJECT_SPEC_TYPE = `${CodeNamespace.key}.code-project-spec`;
export const CODE_PROJECT_BUILD_TYPE = `${CodeNamespace.key}.code-project-build`;

/**
 * Graph node type for the per-plugin MDL spec child node contributed by this
 * plugin to `org.dxos.plugin` nodes (owned by `plugin-registry`). plugin-code
 * is the canonical MDL renderer, so the spec child node and matching surface
 * live here.
 */
export const PLUGIN_SPEC_TYPE = 'org.dxos.plugin.spec';

/** Picks an existing feature to add to a spec's map. */
export const ADD_FEATURE_DIALOG = DXN.make(`${CodeNamespace.key}.addFeatureDialog`);

/** The spec plank's companion that shows the feature selected on its feature map. */
export const FEATURE_COMPANION = 'feature';

/** Companion variant of a spec's panel of views: its definitions, review, decisions and the rest. */
export const SPEC_COMPANION = 'spec';

/** Registry key of the built-in introspect-mcp server behind the Coder skill. */
export const INTROSPECT_MCP_KEY = 'org.dxos.mcp.introspect';

/**
 * The introspect-mcp server, whose tools (list_packages, get_package, list_symbols, find_symbol,
 * get_symbol) look up DXOS and Composer APIs. Addressed through the EDGE entrypoint, like every
 * other service; a built-in server has no access to the client config, so the environment is pinned here.
 * TODO(burdon): Make configurable via plugin Settings.
 */
export const INTROSPECT_MCP_ENDPOINT = { url: 'https://dxos.network/introspect/mcp', protocol: 'http' } as const;
