//
// Copyright 2024 DXOS.org
//

import { FunctionArgumentType, FunctionPlugin } from 'hyperformula';
import { type PluginFunctionType } from 'hyperformula/typings/interpreter/plugin/FunctionPlugin';

export class CustomPlugin extends FunctionPlugin {
  foo: PluginFunctionType = (ast, state) => {
    return this.runFunction(ast.args, state, this.metadata('FOO'), () => {
      return Math.random();
    });
  };
}

CustomPlugin.implementedFunctions = {
  FOO: {
    method: 'foo',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
  },
};

export const CustomPluginTranslations = {
  enGB: {
    FOO: 'FOO',
  },
  enUS: {
    FOO: 'FOO',
  },
};
