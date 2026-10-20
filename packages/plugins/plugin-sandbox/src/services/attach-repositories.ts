//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, type Ref } from '@dxos/echo';
import { type Repo } from '@dxos/types';

import * as RepositoryService from '../types/RepositoryService.ts';
import { remoteName } from './remote-name.ts';
import { type AttachedRepository } from './SandboxClient.ts';

/**
 * The attachments for `repositories`, one per repository, each named as a git remote unique within the
 * sandbox. Each repository is backed on EDGE first: a token can only be minted for a repository that
 * exists there, and one created offline or on another device may not yet.
 */
export const resolveAttachments = (spaceId: string, repositories: readonly Ref.Ref<Repo.Repo>[]) =>
  Effect.gen(function* () {
    const repositoryService = yield* RepositoryService.Service;
    const taken = new Set<string>();
    const attached: AttachedRepository[] = [];
    for (const ref of repositories) {
      const repository = yield* Database.load(ref);
      const id = yield* RepositoryService.edgeIdOf(repository);
      // The same repository attached twice is one remote, whatever form its ref took.
      if (attached.some((attachment) => attachment.id === id)) {
        continue;
      }
      yield* repositoryService.create(spaceId, id);
      const name = remoteName({ id, name: repository.name }, taken);
      taken.add(name);
      attached.push({ id, name });
    }
    return attached;
  });
