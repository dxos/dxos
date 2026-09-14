//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { StudioSkill } from '#skills';
import { Lightbox } from '#types';

/** Id of the Studio project template. */
export const STUDIO_TEMPLATE_ID = 'org.dxos.project.studio';

/** The one task every studio project starts with; the studio skill knows how to do it. */
export const STUDIO_TASK_TITLE = 'Create a simple 3 frame storyboard that explains how the Studio plugin works';

const STUDIO_INSTRUCTIONS = trim`
  This is a media studio project. Its artifacts are storyboards, lightboxes and the media artifacts
  (generated images and videos) they show. Use the studio skill to build storyboards: a narrative of
  frames, each a generated media artifact. File everything you make into this project's artifacts.
`;

/** Skills for the project's chats: the studio operations plus the project skill, which files artifacts. */
const PROJECT_SKILL_KEYS = [StudioSkill.key, 'org.dxos.skill.project'] as const;

/**
 * "Studio" project template: the default project with the studio brief and skill, one Lightbox
 * (parented to the project so it persists with the create op's single `Database.add` cascade and is
 * deleted with the project), and one starter task on the ledger. Nothing on the Project marks it as
 * studio — the template is the only distinction.
 */
export const studioTemplate: ProjectCapabilities.Template = {
  id: STUDIO_TEMPLATE_ID,
  label: 'Studio',
  icon: 'ph--paint-brush--regular',
  scaffold: ({ name }) =>
    Effect.sync(() => {
      const project = scaffoldProject({
        name,
        text: STUDIO_INSTRUCTIONS,
        skills: PROJECT_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
      });
      const lightbox = Lightbox.make({ name: 'Lightbox' });
      // Ref before parent edge: the ref is what declares the edge (see `Obj.setParent`).
      Obj.update(project, (project) => {
        project.artifacts.push(Ref.make(lightbox));
      });
      Obj.setParent(lightbox, project);
      // The ledger is owned by the project (`Project.make`), so the task rides the same cascade.
      const taskSet = project.taskSet?.target;
      if (taskSet) {
        const task = Task.make({ [Obj.Parent]: taskSet, title: STUDIO_TASK_TITLE, status: 'todo' });
        Obj.update(taskSet, (taskSet) => {
          taskSet.tasks.push(Ref.make(task));
        });
      }
      return project;
    }),
};
