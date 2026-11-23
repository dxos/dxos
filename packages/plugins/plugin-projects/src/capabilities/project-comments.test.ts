//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import { Obj } from '@dxos/echo';
import { toCursor } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';
import { Outline, TaskSet } from '@dxos/types';

import { getText, resolveScope } from './project-comments.ts';

describe('project comments', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Outline.Outline, TaskSet.TaskSet, Text.Text],
    });
    const project = db.add(Project.make({ name: 'Mail' }));
    const notes = await project.outline?.load();
    invariant(notes, 'Missing notes.');
    const text = await notes.content.load();
    Obj.update(text, (text) => {
      text.content = '- [ ] Sync drafts';
    });
    await db.flush();
    return { project, notes, text };
  };

  test("a project's comments cover its notes, anchored into their text", async ({ expect }) => {
    const { project, notes, text } = await setup();

    const targets = AtomRegistry.make().get(Atom.make((get) => resolveScope(project, get)))?.targets;
    expect(targets).toContain(notes);

    const accessor = Doc.createAccessor(text, ['content']);
    const anchor = `${toCursor(accessor, 6)}:${toCursor(accessor, 17)}`;
    expect(getText(notes, anchor)).toBe('Sync drafts');
  });
});
