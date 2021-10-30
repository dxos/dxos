//
// Copyright 2020 DXOS.org
//

import { DevtoolsContext } from "..";

export const resetStorage = async (hook: DevtoolsContext) => {
  await hook.client.reset();
  window.location.reload();
};
