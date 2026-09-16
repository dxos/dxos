//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import type * as TourModule from '@dxos/app-toolkit/Tour';

import {
  AppGraphBuilder,
  CreateObject,
  HelpState,
  OperationHandler,
  PluginAsset,
  ReactRoot,
  ReactSurface,
  Schema,
  SkillDefinition,
  SupportSettings,
  Tour,
  TourAutoStart,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

/**
 * `helpSteps` is a loader rather than an array so the tour's step definitions — and the operations
 * their `before` hooks invoke — stay out of the host's eager boot graph.
 */
export type SupportPluginOptions = { helpSteps?: () => Promise<TourModule.Step[]> };

export const SupportPlugin = Plugin.define<SupportPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(HelpState),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SupportSettings),
  Plugin.addModule(Tour),
  Plugin.addModule(TourAutoStart),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default SupportPlugin;
