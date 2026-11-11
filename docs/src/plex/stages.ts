//
// Copyright 2026 DXOS.org
//

import { type PanelId } from '@dxos/plugin-inspector';

/** The learning-path pages that build Bookmarks, in order, each with the modules it adds. */
export const STAGES = {
  'create-plugin': ['translations'],
  'define-type': ['schema', 'CreateObject'],
  'add-surface': ['ReactSurface'],
  'add-operation': ['OperationHandler', 'SkillDefinition'],
  'extend-app-graph': ['AppGraphBuilder'],
} as const satisfies Record<string, readonly string[]>;

export type Stage = keyof typeof STAGES;

export const isStage = (value: unknown): value is Stage => typeof value === 'string' && value in STAGES;

/** The modules Bookmarks has after `stage`'s page. */
export const modulesAt = (stage: Stage): string[] => {
  const stages = Object.keys(STAGES);
  return Object.entries(STAGES)
    .filter(([name]) => stages.indexOf(name) <= stages.indexOf(stage))
    .flatMap(([, modules]) => modules);
};

/** What each panel says while it is empty: the page that fills it. */
export const EMPTY: Record<PanelId, string> = {
  graph: 'Extend the app graph adds the Bookmarks section to the app graph.',
  operations: 'Add an operation adds the Record visit operation and the Bookmarks skill.',
  plugin: 'Create a plugin writes the plugin.',
  surfaces: 'Add a surface adds the article that shows a bookmark.',
  translations: 'Create a plugin adds the strings the plugin shows.',
  types: 'Define a type adds the Bookmark type.',
};
