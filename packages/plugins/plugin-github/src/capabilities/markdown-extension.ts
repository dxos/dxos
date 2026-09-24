//
// Copyright 2026 DXOS.org
//

import { ViewPlugin } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Project from '@dxos/compute/Project';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { Repo, TaskSet } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import { githubLinks, githubReferences, referenceUrl } from '../extensions/index.ts';

/** `owner/repo` — what `sync` writes as the name of the TaskSet mirroring a repository. */
const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

/**
 * `#123` in a document resolves against the repository the document's project names: this plugin
 * owns that knowledge, so the decoration is contributed rather than built into the editor. A full
 * pull-request or issue URL needs no repository and becomes a chip whose popover this plugin's
 * link resolver answers.
 *
 * Ambiguity is answered by declining. A space with several repositories and no project naming one
 * has no single meaning for a bare number, so the reference is left as text rather than guessed at.
 */
export const MarkdownExtension = Capability.makeModule(
  'MarkdownExtension',
  // Browser-only: the editor it decorates and the popover it answers render nowhere else.
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start, environments: [] },
  Effect.fnUntraced(function* () {
    return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
      ({ document: doc, subject, viewMode }) => {
        // Source view shows the document's own text; a decoration there would hide what it is.
        if (viewMode === 'source') {
          return undefined;
        }

        // A full URL needs no object: a task's description or an outline gets the chip too. A bare
        // `#123` resolves against the repository of the project owning the edited object, so it
        // needs one — the document, or whatever else the editor edits.
        const object = doc ?? subject;
        const db = object && Obj.getDatabase(object);
        if (!object || !db) {
          return [githubLinks()];
        }

        // Nearest binding first: the project that owns the object names its repository explicitly,
        // and only a space with exactly one mirrored repository can answer for an object that
        // belongs to no project.
        const mirrored = watchMirroredRepos(db);
        return [
          githubLinks(),
          githubReferences({
            resolve: (number) => {
              const repo = projectRepo(db, object) ?? mirrored.single();
              return repo ? referenceUrl(repo, number) : undefined;
            },
          }),
          ViewPlugin.define(() => ({ destroy: mirrored.stop })),
        ];
      },
    ]);
  }),
);

/** The `repo` of the project owning `object`, else the repository its adopted task set mirrors. */
const projectRepo = (db: Database.Database, object: Obj.Unknown): string | undefined => {
  const project = owningProject(object);
  if (!project) {
    return undefined;
  }

  const repo = project.repo?.target;
  if (repo && Repo.instanceOf(repo)) {
    return Repo.fullName(repo);
  }

  // A project mirroring a repository adopts its synced task set, whose name is `owner/repo`.
  const taskSet = project.taskSet?.target;
  return taskSet && isMirrored(taskSet) ? repoName(taskSet) : undefined;
};

/** Walks the ECHO parent edge: a project's outline, instructions and artifacts all cascade from it. */
const owningProject = (object: Obj.Unknown): Project.Project | undefined => {
  let current: Obj.Unknown | undefined = object;
  // Bounded: a malformed parent cycle must not hang the editor's decoration pass.
  for (let depth = 0; current && depth < 8; depth++) {
    if (Obj.instanceOf(Project.Project, current)) {
      return current;
    }
    current = Obj.getParent(current);
  }
  return undefined;
};

/**
 * The repositories this space mirrors, as `owner/name`. Read synchronously from a decoration pass,
 * where a fresh `runSync()` would answer with whatever the tab has loaded so far; the subscription
 * brings the set to the complete answer and keeps it there for as long as the editor lives.
 */
const watchMirroredRepos = (db: Database.Database) => {
  const names = new Set<string>();
  const stop = db.query(Query.select(Filter.type(TaskSet.TaskSet))).subscribe(
    (result) => {
      names.clear();
      for (const name of result.results.filter(isMirrored).map(repoName)) {
        if (name) {
          names.add(name);
        }
      }
    },
    { fire: true },
  );
  return {
    /** The one mirrored repository, or undefined when there is none or more than one. */
    single: () => (names.size === 1 ? [...names][0] : undefined),
    stop,
  };
};

const isMirrored = (taskSet: TaskSet.TaskSet): boolean =>
  Obj.getMeta(taskSet).keys.some(({ source }) => source === GITHUB_SOURCE);

const repoName = (taskSet: TaskSet.TaskSet): string | undefined =>
  taskSet.name && REPO_NAME.test(taskSet.name) ? taskSet.name : undefined;
