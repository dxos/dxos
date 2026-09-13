//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { scaffoldProject } from '@dxos/plugin-projects/templates';

import { Lightbox } from '#types';

/** Id of the Studio project template. */
export const STUDIO_TEMPLATE_ID = 'org.dxos.project.studio';

/**
 * "Studio" project template: the default project plus one Lightbox, parented to the project so it
 * persists with the create op's single `Database.add` cascade and is deleted with the project.
 * Nothing on the Project marks it as studio — the template is the only distinction.
 */
export const studioTemplate: ProjectCapabilities.Template = {
  id: STUDIO_TEMPLATE_ID,
  label: 'Studio',
  icon: 'ph--paint-brush--regular',
  scaffold: ({ name }) =>
    Effect.sync(() => {
      const project = scaffoldProject({ name });
      const lightbox = Lightbox.make({ name: 'Lightbox' });
      // Ref before parent edge: the ref is what declares the edge (see `Obj.setParent`).
      Obj.update(project, (project) => {
        project.artifacts.push(Ref.make(lightbox));
      });
      Obj.setParent(lightbox, project);
      return project;
    }),
};
