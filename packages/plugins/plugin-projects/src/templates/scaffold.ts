//
// Copyright 2026 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Obj, Ref } from '@dxos/echo';
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
 * chat context chips read sensibly) and task set, all parented so a single `Database.add` cascade
 * persists them and deletion cascades back. Shared by the default template and domain templates,
 * which pass their own instructions text/skills/objects.
 */
export const scaffoldProject = ({ name, description, text, ...instructionsProps }: ScaffoldProjectProps = {}) => {
  const project = Project.make({ name: name ?? '', description });
  const instructions = Instructions.make({
    name: 'Instructions',
    text: text ?? DEFAULT_PROJECT_INSTRUCTIONS,
    ...instructionsProps,
  });
  // Ref before parent edge: the ref is what declares the edge (see `Obj.isDeclaredParentEdge`).
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
  });
  Obj.setParent(instructions, project);
  // The task set comes from `Project.make` — every project owns a ledger from the start.
  return project;
};
