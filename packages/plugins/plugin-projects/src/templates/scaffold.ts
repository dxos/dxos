//
// Copyright 2026 DXOS.org
//

import { Instructions, Project } from '@dxos/compute';
import { Collection, Obj, Ref } from '@dxos/echo';
import { TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

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
  // Every project owns a task set from the start: tasks are parented to it, so the ledger exists
  // before the first task rather than being created ad hoc on first use.
  const tasks = TaskSet.make({ name: 'Tasks' });
  Obj.setParent(tasks, project);
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
    project.artifacts = Ref.make(artifacts);
    project.taskSets = [Ref.make(tasks)];
  });
  return project;
};
