//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export { ProjectsAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { CreateObject } from './create-object.ts';
export { NavigationTargetResolver } from './navigation-target-resolver.ts';
export { OperationHandler } from './operation-handler.ts';
export { SkillDefinition } from './skill-definition.ts';
export { ReactSurface } from './react-surface.ts';
export { Schema } from './schema.ts';
export { SubjectContext } from './subject-context.ts';
export { TaskAction } from './task-action.ts';
export { Templates } from './templates.ts';

export { ProjectsTour as Tour } from './tour.ts';

export const Translations = AppCapability.translations(translations);
