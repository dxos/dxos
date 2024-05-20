//
// Copyright 2023 DXOS.org
//

import { afterTest } from './after-test';

interface ResourceLike {
  open(): Promise<any>;
  close(): Promise<any>;
}

// TODO(burdon): Replace with abstraction relating to Context object?
export const openAndClose = async (...resources: ResourceLike[]) => {
  for (const resourceLike of resources) {
    await resourceLike.open();
    afterTest(() => resourceLike.close());
  }
};
