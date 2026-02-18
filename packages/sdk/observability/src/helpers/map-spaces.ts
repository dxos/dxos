//
// Copyright 2023 DXOS.org
//

import type { Space } from '@dxos/client-protocol';
import { timestampMs } from '@dxos/protocols/buf';

export type MapSpacesOptions = {
  verbose?: boolean;
  truncateKeys?: boolean;
};

export const mapSpaces = (spaces: Space[], options: MapSpacesOptions = { verbose: false, truncateKeys: false }) => {
  return spaces.map((space) => {
    // TODO(burdon): Factor out.
    // TODO(burdon): Agent needs to restart before `ready` is available.
    const { open, ready } = space.internal.data.metrics ?? {};
    const startup = open && ready ? timestampMs(ready) - timestampMs(open) : undefined;

    // TODO(burdon): Get feeds from client-services if verbose (factor out from devtools/diagnostics).
    // const host = client.services.services.DevtoolsHost!;
    const pipeline = space.internal.data.pipeline;
    const epochAssertion = pipeline?.currentEpoch?.subject?.assertion as unknown as
      | { timeframe?: { totalMessages?(): number }; number?: number }
      | undefined;
    const startDataMutations = epochAssertion?.timeframe?.totalMessages?.() ?? 0;
    const epoch = epochAssertion?.number;
    // const appliedEpoch = pipeline?.appliedEpoch?.subject.assertion.number;
    const currentDataTimeframe = pipeline?.currentDataTimeframe as unknown as { totalMessages?(): number } | undefined;
    const targetDataTimeframe = pipeline?.targetDataTimeframe as unknown as { totalMessages?(): number } | undefined;
    const currentDataMutations = currentDataTimeframe?.totalMessages?.() ?? 0;
    const totalDataMutations = targetDataTimeframe?.totalMessages?.() ?? 0;

    return {
      // TODO(nf): truncate keys for DD?
      key: space.key.truncate(),
      open: space.isOpen,
      members: space.members.get().length,
      objects: space.internal.db.coreDatabase.getAllObjectIds().length,
      startup,
      epoch,
      // appliedEpoch,
      startDataMutations,
      currentDataMutations,
      totalDataMutations,

      // TODO(burdon): Negative?
      progress: (
        Math.min(Math.abs((currentDataMutations - startDataMutations) / (totalDataMutations - startDataMutations)), 1) *
        100
      ).toFixed(0),
    };
  });
};
