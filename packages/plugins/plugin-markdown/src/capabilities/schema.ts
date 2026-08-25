//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Text } from '@dxos/schema';

import { Markdown } from '#types';

/**
 * Registers this plugin's schemas. A module body rather than a bare list, because a descriptor names
 * modules by file and every module file has the same shape — the schemas still load on demand.
 */
export default () => Effect.succeed([Capability.contribute(AppCapabilities.Schema, [Markdown.Document, Text.Text])]);
