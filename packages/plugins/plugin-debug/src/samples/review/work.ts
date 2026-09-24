//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Project from '@dxos/compute/Project';
import { Database, type Obj, Ref } from '@dxos/echo';
import { Outline, Person, PullRequest, Repo, Task, TaskSet } from '@dxos/types';

import { type ImageKey, type MediaResult, type VideoKey } from './assets.ts';
import { daysAgo } from './util.ts';

//
// The review queue: real dxos/dxos pull requests, each filed against the task it delivered, with the
// screenshots and recordings its author attached. Finished work carries merged PRs; the tasks in
// review carry the PRs still open, which is what a reviewer opens the space to work through.
//

type PullRequestKey = 'rail' | 'oauth' | 'toast' | 'halo' | 'archify';

const PULL_REQUEST_SEEDS: ReadonlyArray<
  SampleSpace.Seed<PullRequestKey, Omit<Obj.MakeProps<typeof PullRequest.PullRequest>, 'owner' | 'repo'>>
> = [
  {
    key: 'rail',
    number: 12544,
    title: 'plugin-navtree: stop the L0 rail insetting items by the scrollbar strip',
    state: 'merged',
    author: 'wittjosiah',
    headBranch: 'claude/l0-box-centering-regression-lg55l7',
    additions: 65,
    deletions: 4,
  },
  {
    key: 'oauth',
    number: 12690,
    title: 'onboarding, connector: run desktop OAuth in the system browser',
    state: 'merged',
    author: 'wittjosiah',
    headBranch: 'claude/tauri-oauth-login-ftwie0',
    additions: 941,
    deletions: 206,
  },
  {
    key: 'toast',
    number: 12954,
    title: "react-ui: count down a toast's remaining time in a bar",
    state: 'merged',
    author: 'wittjosiah',
    headBranch: 'claude/toast-progress-indicator-e3a046',
    additions: 137,
    deletions: 30,
  },
  {
    key: 'halo',
    number: 13336,
    title: 'halo: switch identities in place with deleteIdentity instead of a reset and reload',
    state: 'open',
    author: 'dmaretskyi',
    headBranch: 'dm/admiring-gauss-nqdcuk',
    additions: 501,
    deletions: 159,
  },
  {
    key: 'archify',
    number: 12952,
    title: 'plugin-archify: add Archify architecture diagrams',
    state: 'open',
    author: 'dmaretskyi',
    headBranch: 'claude/archify-composer-plugin-5rfrpr',
    additions: 3176,
    deletions: 0,
  },
];

type ReviewerKey = 'mira' | 'kai';

const REVIEWER_SEEDS: ReadonlyArray<SampleSpace.Seed<ReviewerKey, { fullName: string; jobTitle: string }>> = [
  { key: 'mira', fullName: 'Mira Okafor', jobTitle: 'Design engineer' },
  { key: 'kai', fullName: 'Kai Lindqvist', jobTitle: 'Platform engineer' },
];

type TaskSeed = {
  readonly title: string;
  readonly status: Task.Status;
  readonly description: string;
  readonly priority?: Task.Priority;
  readonly pullRequest?: PullRequestKey;
  readonly images?: ReadonlyArray<ImageKey>;
  readonly videos?: ReadonlyArray<VideoKey>;
  readonly reviewers?: ReadonlyArray<ReviewerKey>;
  /** Days before the reference date the task was opened. */
  readonly opened: number;
};

const TASK_SEEDS: ReadonlyArray<TaskSeed> = [
  {
    title: 'Stop the L0 rail insetting items by the scrollbar strip',
    status: 'done',
    priority: 'medium',
    description: 'The current-workspace indicator is tucked under the avatar since the overlay scrollbar landed.',
    pullRequest: 'rail',
    images: ['railBefore', 'railAfter'],
    opened: 30,
  },
  {
    title: 'Run desktop OAuth in the system browser',
    status: 'done',
    priority: 'urgent',
    description:
      'Every OAuth flow in the desktop app fails before the provider page appears: WKWebView opens no window.',
    pullRequest: 'oauth',
    images: ['oauthIdle', 'oauthPending'],
    opened: 24,
  },
  {
    title: "Count down a toast's remaining time",
    status: 'done',
    priority: 'low',
    description: 'A toast disappears with no warning; show the time it has left and pause it on hover.',
    pullRequest: 'toast',
    videos: ['toastCountdown'],
    opened: 18,
  },
  {
    title: 'Switch identities in place instead of a reset and reload',
    status: 'review',
    priority: 'high',
    description: 'Logging out, recovering or joining another identity wipes the profile and reloads the app.',
    pullRequest: 'halo',
    videos: ['haloLogin'],
    reviewers: ['kai'],
    opened: 6,
  },
  {
    title: 'Add Archify architecture diagrams',
    status: 'review',
    priority: 'medium',
    description: 'Render a package’s module graph as a diagram an agent can generate and a person can read.',
    pullRequest: 'archify',
    videos: ['archify'],
    reviewers: ['mira', 'kai'],
    opened: 12,
  },
  {
    title: "Show a pull request's review state on its task pill",
    status: 'started',
    priority: 'medium',
    description: 'The pill colours by open/merged/closed; approved and changes-requested are invisible.',
    opened: 2,
  },
  {
    title: 'Record a demo for every task in review',
    status: 'todo',
    priority: 'low',
    description: 'A reviewer should be able to watch the change before reading the diff.',
    opened: 1,
  },
];

export type WorkResult = {
  project: Project.Project;
  taskSet: TaskSet.TaskSet;
  tasks: Task.Task[];
  pullRequests: Record<PullRequestKey, PullRequest.PullRequest>;
};

/** Pull requests, reviewers, the task set, and the project that gathers them with the media. */
export const Work: SampleSpace.Phase<WorkResult, MediaResult> = SampleSpace.phase('work', {
  schemas: [
    PullRequest.PullRequest,
    Person.Person,
    Task.Task,
    TaskSet.TaskSet,
    Outline.Outline,
    Repo.Repo,
    Project.Project,
  ],
  run: ({ images, videos }: MediaResult) =>
    Effect.gen(function* () {
      const pullRequests = yield* SampleSpace.seed(PULL_REQUEST_SEEDS, ({ key: _key, ...seed }) =>
        Database.add(
          PullRequest.make({
            ...seed,
            owner: 'dxos',
            repo: 'dxos',
            url: `https://github.com/dxos/dxos/pull/${seed.number}`,
            baseBranch: 'main',
          }),
        ),
      );

      const reviewers = yield* SampleSpace.seed(REVIEWER_SEEDS, ({ key: _key, ...seed }) =>
        Database.add(Person.make(seed)),
      );

      const tasks = TASK_SEEDS.map((seed) =>
        Task.make({
          title: seed.title,
          description: seed.description,
          status: seed.status,
          priority: seed.priority,
          reviewers: seed.reviewers?.map((key) => ({ contact: Ref.make(reviewers[key]) })),
          artifacts: [
            ...(seed.pullRequest ? [Ref.make(pullRequests[seed.pullRequest])] : []),
            ...(seed.images ?? []).map((key) => Ref.make(images[key])),
            ...(seed.videos ?? []).map((key) => Ref.make(videos[key])),
          ],
          history: [{ date: daysAgo(seed.opened), event: 'created', description: 'Opened.' }],
        }),
      );

      const taskSet = yield* Database.add(TaskSet.make({ name: 'Composer polish' }));
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      const repo = yield* Database.add(
        Repo.make({
          name: 'dxos',
          owner: 'dxos',
          url: 'https://github.com/dxos/dxos',
          description: 'TypeScript implementation of the DXOS protocols, SDK, toolchain and Composer.',
          defaultBranch: 'main',
        }),
      );
      const outline = yield* Database.add(Outline.make({ name: 'Review notes' }));

      const project = yield* Database.add(
        Project.make({
          name: 'Composer polish',
          description: 'Small, visible fixes to Composer, each landed as a reviewed pull request with a demo.',
          status: 'active',
          repo: Ref.make(repo),
          taskSet: Ref.make(taskSet),
          outline: Ref.make(outline),
          artifacts: [
            ...Object.values(pullRequests).map((pullRequest) => Ref.make(pullRequest)),
            ...Object.values(images).map((image) => Ref.make(image)),
            ...Object.values(videos).map((video) => Ref.make(video)),
          ],
        }),
      );

      return { project, taskSet, tasks, pullRequests };
    }),
});
