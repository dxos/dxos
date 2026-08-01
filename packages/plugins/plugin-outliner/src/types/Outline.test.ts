//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { ExternalProject, Task } from '@dxos/types';

import * as Outline from './Outline';

describe('Outline', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const result = await builder.createDatabase({
      types: [Outline.Outline, Text.Text, Task.Task, ExternalProject.ExternalProject],
    });
    db = result.db;
  });

  afterEach(async () => {
    await builder.close();
  });

  describe('getOrCreateProject', () => {
    test('creates and links a project named after the outline', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const project = await Outline.getOrCreateProject(outline, db);

      expect(project.name).to.eq('Roadmap');
      expect(outline.project?.target?.id).to.eq(project.id);
    });

    test('falls back to a default name for an unnamed outline', async ({ expect }) => {
      const outline = db.add(Outline.make());
      await db.flush();

      const project = await Outline.getOrCreateProject(outline, db);

      expect(project.name).to.eq(Outline.DEFAULT_PROJECT_NAME);
    });

    test('links a single project when conversions race', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const projects = await Promise.all([
        Outline.getOrCreateProject(outline, db),
        Outline.getOrCreateProject(outline, db),
      ]);

      expect(projects[1].id).to.eq(projects[0].id);
      expect(outline.project?.target?.id).to.eq(projects[0].id);
    });

    test('reuses the linked project', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const first = await Outline.getOrCreateProject(outline, db);
      const second = await Outline.getOrCreateProject(outline, db);

      expect(second.id).to.eq(first.id);
    });
  });

  describe('createTask', () => {
    test('creates a task parented to the outline project', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const task = await Outline.createTask(outline, db, '  Buy milk  ');

      expect(task.title).to.eq('Buy milk');
      expect(task.status).to.eq('todo');
      expect(task.project?.target?.id).to.eq(outline.project?.target?.id);
    });

    test('parents every task to the same lazily created project', async ({ expect }) => {
      const outline = db.add(Outline.make());
      await db.flush();

      const first = await Outline.createTask(outline, db, 'First');
      const second = await Outline.createTask(outline, db, 'Second');

      expect(second.project?.target?.id).to.eq(first.project?.target?.id);
    });
  });
});
