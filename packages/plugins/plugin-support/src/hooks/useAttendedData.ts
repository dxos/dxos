//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useAttended } from '@dxos/react-ui-attention';

/** The attended node's `data`: the subject a tour matcher is asked about. */
export const useAttendedData = (): unknown => {
  const { graph } = useAppGraph();
  const attended = useAttended();
  const attendedId = attended[0];
  const nodeAtom = useMemo(() => graph.node(attendedId ?? ''), [graph, attendedId]);
  return Option.getOrElse(useAtomValue(nodeAtom), () => undefined)?.data;
};
