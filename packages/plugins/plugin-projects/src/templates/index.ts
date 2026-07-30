//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Ref } from '@dxos/echo';

import { ProjectCapabilities } from '#types';

import { inboxResearch } from './inbox-research';
import { scaffoldProject } from './scaffold';

export * from './inbox-research';
export * from './scaffold';

/**
 * Blank template: the default instructions brief; a subject (when created from an object's context)
 * is seeded as standing context, mirroring plugin-routine's blank template.
 */
export const blank: ProjectCapabilities.Template = {
  id: ProjectCapabilities.BlankTemplateId,
  label: 'Blank',
  icon: 'ph--stack--regular',
  scaffold: ({ name, subject }) =>
    Effect.succeed(scaffoldProject({ name, objects: subject ? [Ref.make(subject)] : undefined })),
};

/**
 * Templates contributed by plugin-projects itself. `inboxResearch` lives here rather than in
 * plugin-inbox because plugin-inbox is publishable and this plugin is private — a public package
 * cannot depend on a private one (`check-public-dependencies`); revisit when this plugin publishes.
 */
export const defaultTemplates: ProjectCapabilities.Template[] = [blank, inboxResearch];
