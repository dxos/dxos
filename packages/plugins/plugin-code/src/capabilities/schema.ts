//
// Copyright 2025 DXOS.org
//

import * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';

import { CodeProject, Feature, Showcase, SourceFile } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [
  Spec.Spec,
  SpecReview.SpecReview,
  CodeProject.CodeProject,
  SourceFile.SourceFile,
  Feature.Feature,
  Feature.DependsOn,
  Feature.Implements,
  Showcase.Demonstrates,
];
