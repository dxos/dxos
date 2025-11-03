//
// Copyright 2024 DXOS.org
//

import { HyperFormula } from '@dxos/vendor-hyperformula';

export const getRegisteredFunctionNames = () =>
  HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' }).getRegisteredFunctionNames();
