//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Feature from '@dxos/plugin-projects/Feature';
import * as Showcase from '@dxos/plugin-projects/Showcase';
import { Text } from '@dxos/schema';
import { PullRequest, Task } from '@dxos/types';

import { Presentation } from '#types';

import createShowcase from './create-showcase.ts';

const testLayer = () =>
  TestDatabaseLayer({
    types: [
      Presentation.Presentation,
      Presentation.Slide,
      Showcase.Demonstrates,
      Feature.Feature,
      Task.Task,
      Text.Text,
      Markdown.Document,
      PullRequest.PullRequest,
    ],
  });

describe('FeatureOperation.CreateShowcase', () => {
  it.effect('writes nothing when a target does not resolve', () =>
    Effect.gen(function* () {
      const gone = yield* Database.add(Feature.make({ name: 'Gone', status: 'planned' }));
      yield* Database.remove(gone);
      yield* Database.flush();
      const exit = yield* Effect.exit(
        createShowcase.handler({ name: 'Orphan', content: '', targets: [Ref.make(gone)] }),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      expect(yield* Database.query(Filter.type(Presentation.Presentation)).run).toHaveLength(0);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('makes a deck: the write-up first, then a linked slide per artifact, demonstrating every target', () =>
    Effect.gen(function* () {
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'operational' }));
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail' }));
      const pullRequest = yield* Database.add(
        PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 1, title: 'Send', state: 'open' }),
      );
      const notes = yield* Database.add(Markdown.make({ name: 'Notes', content: '# Notes' }));
      const { showcase } = yield* createShowcase.handler({
        name: 'Sending a reply',
        content: '# Sending a reply\n\nReply from the inbox.',
        targets: [Ref.make(compose), Ref.make(task)],
        artifacts: [Ref.make(notes), Ref.make(pullRequest)],
      });

      expect(Obj.instanceOf(Presentation.Presentation, showcase)).toBe(true);
      const presentation = Obj.instanceOf(Presentation.Presentation, showcase) ? showcase : undefined;
      expect(presentation?.name).toBe('Sending a reply');
      const slides = [];
      for (const ref of presentation?.slides ?? []) {
        slides.push(yield* Database.load(ref));
      }
      const contents = [];
      for (const slide of slides) {
        contents.push(yield* Database.load(slide.content));
      }
      const [writeUp, ...linked] = contents;
      expect(Obj.instanceOf(Text.Text, writeUp) && writeUp.content).toContain('Reply from the inbox.');
      expect(Presentation.isOwnedContent(slides[0], writeUp)).toBe(true);
      expect(linked.map(({ id }) => id)).toEqual([notes.id, pullRequest.id]);
      // Linked, not taken over: the artifacts keep no parent of the deck's.
      expect(linked.every((artifact) => Obj.getParent(artifact) === undefined)).toBe(true);

      for (const target of [compose, task]) {
        const shown = yield* Database.query(Query.select(Filter.id(target.id)).targetOf(Showcase.Demonstrates).source())
          .run;
        expect(shown.map(({ id }) => id)).toEqual([showcase.id]);
      }
    }).pipe(Effect.provide(testLayer())),
  );
});
