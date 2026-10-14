//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { ClassNodeType, SkillDefinition, Translations } from '#capabilities';
import { meta } from '#meta';

export const UmlPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ClassNodeType),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default UmlPlugin;
