//
// Copyright 2024 DXOS.org
//

import { HyperFormula } from 'hyperformula';

export const getRegisteredFunctionNames = () => {
 return HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' }).getRegisteredFunctionNames();
}
