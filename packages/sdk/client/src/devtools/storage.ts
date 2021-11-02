//
// Copyright 2020 DXOS.org
//

import { DevtoolsHook, DevtoolsServiceDependencies } from '..';

export const resetStorage = async (hook: DevtoolsServiceDependencies) => {
  await hook.echo.reset();
  window.location.reload();
};
