//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';


const KEY_REGEX = /\w+/;

// NOTE: The `relation` is different from the `type`.
type EdgeMeta = { source: string; target: string; relation?: string };

export const createEdgeId = ({ source, target, relation }: EdgeMeta) => {
  invariant(source.match(KEY_REGEX), `invalid source: ${source}`);
  invariant(target.match(KEY_REGEX), `invalid target: ${target}`);
  return [source, relation, target].join('_');
};

export const parseEdgeId = (id: string): EdgeMeta => {
  const [source, relation, target] = id.split('_');
  invariant(source.length && target.length);
  return { source, relation: relation.length ? relation : undefined, target };
};
