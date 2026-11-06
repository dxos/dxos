//
// Copyright 2026 DXOS.org
//

import type * as Translations from '@dxos/app-toolkit/Translations';

import { ProjectsNamespace } from './namespace.ts';
import type * as SpecSession from './types/SpecSession.ts';

const IDS = ['definitions', 'related', 'cursor', 'ledger', 'review'] as const;

export type SpecViewId = (typeof IDS)[number];

export type SpecViewEntry = { id: SpecViewId; group: SpecSession.Group; icon: string; label: Translations.Label };

const view = (id: SpecViewId, group: SpecSession.Group, icon: string): SpecViewEntry => ({
  id,
  group,
  icon,
  label: [`spec-view.${id}.label`, { ns: ProjectsNamespace.key }],
});

/** The views of a spec that read any dialect's blocks, by the companion tab each is one of. */
export const SPEC_VIEWS: readonly SpecViewEntry[] = [
  view('definitions', 'structure', 'ph--tree-structure--regular'),
  view('related', 'structure', 'ph--crosshair--regular'),
  view('cursor', 'decisions', 'ph--crosshair--regular'),
  view('ledger', 'decisions', 'ph--list-checks--regular'),
  view('review', 'review', 'ph--seal-check--regular'),
];

export const isSpecView = (value: string): value is SpecViewId => (IDS as readonly string[]).includes(value);
