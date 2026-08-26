//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Filter, Obj, Query } from '@dxos/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { TaskSet } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants';
import { githubReferences, referenceUrl } from '../extensions';

/** `owner/repo` — what `sync` writes as the name of the TaskSet mirroring a repository. */
const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

/**
 * `#123` in a document resolves against the repository the document's space mirrors: this plugin
 * owns that knowledge, so the decoration is contributed rather than built into the editor.
 *
 * Ambiguity is answered by declining: a space mirroring two repositories has no single meaning for
 * a bare number, so the reference is left as text rather than guessed at.
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
            const repo = mirroredRepo(db);
            return repo ? referenceUrl(repo, number) : undefined;
          },
        });
      },
    ]);
  }),
);

/** The single repository this space mirrors, or undefined when there is none or more than one. */
const mirroredRepo = (db: ReturnType<typeof Obj.getDatabase>): string | undefined => {
  const sets = db
    ?.query(Query.select(Filter.type(TaskSet.TaskSet)))
    .runSync()
    .filter((set) => Obj.getMeta(set).keys.some(({ source }) => source === GITHUB_SOURCE))
    .map((set) => set.name)
    .filter((name): name is string => !!name && REPO_NAME.test(name));

  return sets?.length === 1 ? sets[0] : undefined;
};
