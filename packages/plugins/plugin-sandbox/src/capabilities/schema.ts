//
// Copyright 2026 DXOS.org
//

import { AccessToken } from '@dxos/link';

import { Sandbox } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Sandbox.Sandbox, AccessToken.AccessToken];
