//
// Copyright 2023 DXOS.org
//

import { type FunctionHandler } from '../../handler';

let callHandler: FunctionHandler<any> = async ({ response }) => response.status(200);

export const setTestCallHandler = (handler: FunctionHandler<any>) => {
  callHandler = handler;
};

export const handler: FunctionHandler<any> = async (args) => {
  return callHandler(args);
};
