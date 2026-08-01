//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, type Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { CollectionItemAnnotation, Text } from '@dxos/schema';
import { ExternalProject, Task } from '@dxos/types';

export class Outline extends Type.makeObject<Outline>(DXN.make('org.dxos.type.outline', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
    /** Owns the tasks converted from this outline's items; created lazily on the first conversion. */
    project: Schema.optional(Ref.Ref(ExternalProject.ExternalProject)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--tree-structure--regular', hue: 'indigo' }),
    CollectionItemAnnotation.set(true),
  ),
) {}

export const make = ({ name, content }: { name?: string; content?: string } = {}): Outline => {
  return Obj.make(Outline, {
    name,
    content: Ref.make(Text.make({ content })),
  });
};

export const DEFAULT_PROJECT_NAME = 'Untitled project';

/**
 * Get the outline's project, creating and linking one on first use.
 */
export const getOrCreateProject = async (
  outline: Outline,
  db: Database.Database,
): Promise<ExternalProject.ExternalProject> => {
  const existing = await outline.project?.load();
  if (existing) {
    return existing;
  }

  const project = db.add(ExternalProject.make({ name: outline.name ?? DEFAULT_PROJECT_NAME }));
  Obj.update(outline, (outline) => {
    outline.project = Ref.make(project);
  });

  return project;
};

/**
 * Create a task owned by the outline's project.
 */
export const createTask = async (outline: Outline, db: Database.Database, title: string): Promise<Task.Task> => {
  const project = await getOrCreateProject(outline, db);
  return db.add(Task.make({ title: title.trim(), status: 'todo', project: Ref.make(project) }));
};
