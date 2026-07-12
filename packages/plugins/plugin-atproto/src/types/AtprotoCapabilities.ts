//
// Copyright 2026 DXOS.org
//

import type * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { type Connection } from '@dxos/plugin-connector';

import { meta } from '#meta';

import type * as AtprotoRepo from '../services/AtprotoRepo';

/**
 * Builds an {@link AtprotoRepo.Service} layer for a connection. The default (live) factory resolves
 * credentials + PDS and talks to the user's repo via the Edge proxy; stories/tests override this
 * capability with a factory that returns the in-memory mock, so companion + PDS-browser UIs are
 * exercisable without a network. The error channel is unconstrained (`unknown`) since live and mock
 * factories fail with different error sets.
 */
export type RepoLayerFactory = (connection: Connection.Connection) => Layer.Layer<AtprotoRepo.Service, unknown>;

export const RepoLayer = Capability.make<RepoLayerFactory>(`${meta.profile.key}.capability.repo-layer`);

/**
 * Builds a public, read-only {@link AtprotoRepo.Service} layer for an arbitrary handle/DID (no
 * credentials). Used by the PDS browser to view any account's repo. Stories override with the mock.
 */
export type ReadRepoLayerFactory = (handle: string) => Layer.Layer<AtprotoRepo.Service, unknown>;

export const ReadRepoLayer = Capability.make<ReadRepoLayerFactory>(`${meta.profile.key}.capability.read-repo-layer`);
