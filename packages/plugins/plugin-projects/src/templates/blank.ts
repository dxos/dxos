//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Ref } from '@dxos/echo';

import { ProjectCapabilities } from '#types';

import { scaffoldProject } from './scaffold';

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
