//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { type Space, isSpace } from '@dxos/react-client/echo';

import { meta } from '#meta';

/** Node/subject type for the virtual PDS browser node in the system section. */
export const PDS_NODE_TYPE = `${meta.profile.key}.pds`;

/** Synthetic subject carried by the PDS node; its space scopes the atproto connections. */
export type PdsSubject = { type: string; space: Space };

export const isPdsSubject = (data: unknown): data is PdsSubject =>
  Predicate.isRecord(data) && data.type === PDS_NODE_TYPE && isSpace(data.space);
