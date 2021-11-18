//
// Copyright 2020 DXOS.org
//

import { DevtoolsServiceDependencies } from './devtools-context';

export const resetStorage = async (hook: DevtoolsServiceDependencies) => {
  await hook.echo.reset();
  window.location.reload();
};
