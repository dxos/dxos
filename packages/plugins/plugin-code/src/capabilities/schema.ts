//
// Copyright 2025 DXOS.org
//

import { Spec } from '@dxos/types';

import { CodeProject, SourceFile } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Spec.Spec, CodeProject.CodeProject, SourceFile.SourceFile];
