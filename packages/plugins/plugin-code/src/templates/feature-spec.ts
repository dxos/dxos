//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as Templates from '@dxos/plugin-projects/Templates';
import { trim } from '@dxos/util';

import { FeatureMapSkill } from '../skills/feature-map/index.ts';

/** The project skill drives the tasks; plain keys, as in the `SkillsAnnotation` idiom. */
const PROJECT_SKILL_KEY = 'org.dxos.skill.project';

/** Steers every chat opened in the project's context; the user edits it in the project article. */
const FEATURE_SPEC_INSTRUCTIONS = trim`
  This project specifies a product feature and tracks it to done.
  Keep the feature map on the spec this project owns: one feature per goal the product should meet, each with
  a description of the ideal (what it does when complete, never its current state), its requirements, a status
  (planned, prototype, operational, failing) and its parts as subfeatures on the spec that breaks it down.
  When the feature has a spec, extract its feat blocks into features with the import-spec-features operation rather
  than linking to the spec, and record which features depend on which.
  Turn open work into tasks on the project's task list, linked to the feature they serve; a started task is what
  shows the feature is being worked on.
  When asked to write a spec, draft MDL blocks: a feat block of requirements, scenario blocks for acceptance and a
  test block for QA.
`;

/** "Feature Spec" template: a project for specifying a feature, whose features live on the spec it owns. */
export const featureSpec: ProjectCapabilities.Template = {
  id: 'org.dxos.project.featureSpec',
  label: 'Feature Spec',
  icon: 'ph--puzzle-piece--regular',
  scaffold: ({ name, subject }) =>
    Effect.succeed(
      Templates.scaffoldProject({
        name,
        description: 'Features, their specs and the tasks that deliver them.',
        text: FEATURE_SPEC_INSTRUCTIONS,
        skills: [
          Ref.fromURI(Skill.registryURI(PROJECT_SKILL_KEY)),
          Ref.fromURI(Skill.registryURI(FeatureMapSkill.key)),
        ],
        objects: subject ? [Ref.make(subject)] : undefined,
      }),
    ),
};
