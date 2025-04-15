//
// Copyright 2025 DXOS.org
//

import { useAppGraph } from '@dxos/app-framework';
import { useNode } from '@dxos/plugin-graph';
import { fullyQualifiedId, type ReactiveEchoObject } from '@dxos/react-client/echo';

import { COMPANION_TYPE } from '../types';

export const useCompanions = (object?: ReactiveEchoObject<any>) => {
  const { graph } = useAppGraph();
  const node = useNode(graph, object && fullyQualifiedId(object));
  return node ? graph.nodes(node, { type: COMPANION_TYPE }) : [];
};
