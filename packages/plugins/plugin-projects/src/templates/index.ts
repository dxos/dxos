//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Instructions, Project } from '@dxos/compute';
import { Collection, Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { ProjectCapabilities } from '#types';

/** Default brief seeded into a new Project's agent instructions. */
const DEFAULT_PROJECT_INSTRUCTIONS = trim`
  You are an assistant focused on this project.
  Use its instructions, artifacts, routines, and chats as context to answer questions, summarize activity, and drive its workflows
`;

export type ScaffoldProjectProps = {
  name?: string;
  description?: string;
} & Omit<Instructions.MakeProps, 'name' | 'description'>;

/**
 * Builds the standard in-memory Project graph: the project plus its owned Instructions (named so
 * chat context chips read sensibly) and owned artifacts Collection, all parented so a single
 * `Database.add` cascade persists them and deletion cascades back. Shared by the blank template and
 * domain templates, which pass their own instructions text/skills/objects.
 */
export const scaffoldProject = ({ name, description, text, ...instructionsProps }: ScaffoldProjectProps = {}) => {
  const project = Project.make({ name: name ?? '', description });
  const instructions = Instructions.make({
    name: 'Instructions',
    text: text ?? DEFAULT_PROJECT_INSTRUCTIONS,
    ...instructionsProps,
  });
  Obj.setParent(instructions, project);
  const artifacts = Collection.make();
  Obj.setParent(artifacts, project);
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
    project.artifacts = Ref.make(artifacts);
  });
  return project;
};

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

/** Templates contributed by plugin-projects itself. */
export const defaultTemplates: ProjectCapabilities.Template[] = [blank];
