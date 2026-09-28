//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';

import { type SpaceId } from '@dxos/keys';
import { type DataService } from '@dxos/protocols/rpc';

import { type ClientRepo } from './client-handle.ts';
import { type DocumentMode } from './document-mode.ts';
import { TabClientRepo } from './tab-repo.ts';

export type CreateRepoProps = {
  dataService: DataService.Client;
  runtime: Context.Context<never>;
  spaceId: SpaceId;
};

/** Builds the repo a database holds its documents in. */
export type CreateRepo = (props: CreateRepoProps) => ClientRepo;

/**
 * The repo factory for a document mode. A replica's repo holds Automerge documents, so its module is
 * imported only in replica mode, and a proxy-mode tab never loads Automerge.
 */
export const loadCreateRepo = async (mode: DocumentMode): Promise<CreateRepo> => {
  if (mode === 'proxy') {
    return (props) => new TabClientRepo(props);
  }
  const { RepoProxy } = await import('./repo-proxy.ts');
  return ({ dataService, runtime, spaceId }) => new RepoProxy(dataService, runtime, spaceId);
};
