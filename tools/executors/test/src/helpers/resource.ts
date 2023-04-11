//
// Copyright 2023 DXOS.org
//

import { afterTest } from './after-test';

interface ResourceLike {
  open(): Promise<void>;
  close(): Promise<void>;
}

export const openAndClose = async (...resources: ResourceLike[]) => {
  for (const resourceLike of resources) {
    await resourceLike.open();
    afterTest(() => resourceLike.close());
  }
};
