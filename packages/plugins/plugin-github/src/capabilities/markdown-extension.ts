//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Project from '@dxos/compute/Project';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { Repo, TaskSet } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import { githubReferences, referenceUrl } from '../extensions/index.ts';

/** `owner/repo` — what `sync` writes as the name of the TaskSet mirroring a repository. */
const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

/**
 * `#123` in a document resolves against the repository the document's project names: this plugin
 * owns that knowledge, so the decoration is contributed rather than built into the editor.
 *
 * Ambiguity is answered by declining. A space with several repositories and no project naming one
 * has no single meaning for a bare number, so the reference is left as text rather than guessed at.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
      ({ document: doc, viewMode }) => {
        // Source view shows the document's own text; a decoration there would hide what it is.
        if (viewMode === 'source' || !doc) {
          return undefined;
        }

        const db = Obj.getDatabase(doc);
        if (!db) {
          return undefined;
        }

        return githubReferences({
          resolve: (number) => {
            const repo = resolveRepo(db, doc);
            return repo ? referenceUrl(repo, number) : undefined;
          },
        });
      },
    ]);
  }),
);

/**
 * The repository a reference in `object` belongs to, as `owner/name`.
 *
 * Nearest binding first: the project that owns the object names its repository explicitly, and only
 * a space with exactly one mirrored repository can answer for an object that belongs to no project.
 */
const resolveRepo = (db: Database.Database, object: Obj.Unknown): string | undefined =>
  projectRepo(db, object) ?? mirroredRepo(db);

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

/** The single repository this space mirrors, or undefined when there is none or more than one. */
const mirroredRepo = (db: Database.Database): string | undefined => {
  const names = db
    .query(Query.select(Filter.type(TaskSet.TaskSet)))
    .runSync()
    .filter(isMirrored)
    .map(repoName)
    .filter((name): name is string => !!name);

  return names.length === 1 ? names[0] : undefined;
};

const isMirrored = (taskSet: TaskSet.TaskSet): boolean =>
  Obj.getMeta(taskSet).keys.some(({ source }) => source === GITHUB_SOURCE);

const repoName = (taskSet: TaskSet.TaskSet): string | undefined =>
  taskSet.name && REPO_NAME.test(taskSet.name) ? taskSet.name : undefined;
