//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';

import { log } from '@dxos/log';
import { Organization } from '@dxos/types';

//
// Test data.
//

export const getTestData = () => ({
  organizations: [
    Organization.make({
      name: 'Cyberdyne Systems',
      website: 'https://cyberdyne.com',
    }),
    Organization.make({
      name: 'Acme Robotics',
      website: 'https://acmerobotics.example',
    }),
    Organization.make({
      name: 'Globex Research',
      website: 'https://globex.example',
    }),
  ],
  research: {
    'https://cyberdyne.com': `
      Cyberdyne Systems is a company that builds AI agents.
      They are based in San Francisco, California.
      They were founded in 1984.
      They are a public company.
      They are listed on the NASDAQ under the symbol CYBR.
      They are a member of the S&P 500 index.
    `,
    'https://acmerobotics.example': `
      Acme Robotics designs industrial automation and collaborative robots.
      They are headquartered in Austin, Texas.
      They were founded in 2010.
      They serve manufacturing and logistics customers worldwide.
    `,
    'https://globex.example': `
      Globex Research runs applied R&D labs focused on materials science and energy storage.
      They are based in Cambridge, Massachusetts.
      They partner with universities and government grants programs.
      Their flagship product line is solid-state battery prototypes for EVs.
    `,
  } as Record<string, string>,
});

export interface Task {
  id: string;
  state: 'pending' | 'completed' | 'interrupted';
  website: string;
  deferred: Deferred.Deferred<string>;
}

export interface Service {
  getTasks: () => readonly Task[];
  research: (website: string) => Effect.Effect<string>;
  waitForTaskToAppear: () => Effect.Effect<void>;
  completeOneTask: () => Effect.Effect<void>;
  completeAllTasks: () => Effect.Effect<void>;
}

export class ResearchService extends Context.Tag('@dxos/functions-runtime/testing/ResearchService')<
  ResearchService,
  Service
>() {}

export const layer = Layer.effect(
  ResearchService,
  Effect.gen(function* () {
    const taskSignal = yield* Queue.unbounded<void>();
    const tasks: Task[] = [];
    const complete = (task: Task) =>
      Effect.gen(function* () {
        log.info('complete research', { id: task.id, website: task.website });
        task.state = 'completed';
        const result = getTestData().research[task.website];
        if (!result) {
          yield* Effect.die(new Error(`No research found for ${task.website}`));
          return;
        }
        yield* Deferred.succeed(task.deferred, result);
      });

    return ResearchService.of({
      getTasks: () => tasks,
      research: (website: string) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID();
          const task: Task = { id, state: 'pending', website, deferred: yield* Deferred.make<string>() };
          log.info('start research', { id, website });
          tasks.push(task);
          yield* Queue.offer(taskSignal, undefined);
          return yield* Deferred.await(task.deferred).pipe(
            Effect.onInterrupt(() =>
              Effect.sync(() => {
                log.info('interrupt research', { id, website: task.website });
                task.state = 'interrupted';
              }),
            ),
          );
        }),
      waitForTaskToAppear: () =>
        Effect.gen(function* () {
          while (true) {
            const task = tasks.find((t) => t.state === 'pending');
            if (task) {
              return;
            }
            yield* Queue.take(taskSignal);
          }
        }),
      completeOneTask: () =>
        Effect.gen(function* () {
          const task = tasks.find((t) => t.state === 'pending');
          if (!task) {
            return;
          }
          yield* complete(task);
        }),
      completeAllTasks: () =>
        Effect.gen(function* () {
          while (true) {
            const task = tasks.find((t) => t.state === 'pending');
            if (!task) {
              return;
            }
            yield* complete(task!);
          }
        }),
    });
  }),
);
