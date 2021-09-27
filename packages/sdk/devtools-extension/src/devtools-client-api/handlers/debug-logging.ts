//
// Copyright 2020 DXOS.org
//

// Note that we can not simply import the debug module here and call its enable, disable
// functions -- if we did that we'd be calling a different instance of the createDebug
// object, with the result that we wouldn't change the log output from the application.

import { DevtoolsContext } from '@dxos/client';
import { EnableDebugLoggingRequest } from '@dxos/devtools';

export const enableDebugLogging = (hook: DevtoolsContext, data: EnableDebugLoggingRequest) => {
  hook.debug.enable(data.namespaces);
};

export const disableDebugLogging = (hook: DevtoolsContext) => {
  hook.debug.disable();
};
