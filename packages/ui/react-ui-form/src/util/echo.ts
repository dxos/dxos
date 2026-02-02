//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type JsonPath, setValue as setValuePlain, splitJsonPath } from '@dxos/effect';

/**
 * Sets a value on an object, using Obj.change() if it's an ECHO object.
 */
// TODO(wittjosiah): Consider refactoring Form to not know about ECHO at all.
//   Instead of directly mutating the values object, Form could work with a plain
//   object copy and communicate all mutations through callbacks (e.g., onValuesChanged).
//   The caller would then be responsible for applying changes to ECHO objects via
//   Obj.change(). This would keep Form agnostic to the underlying data layer and
//   avoid coupling react-ui-form to @dxos/echo.
export const setValueEchoAware = <T extends object>(obj: T, path: JsonPath, value: any): T => {
  if (Obj.isObject(obj)) {
    Obj.change(obj, (mutableObj) => {
      Obj.setValue(mutableObj, splitJsonPath(path), value);
    });
    return obj;
  }
  return setValuePlain(obj, path, value);
};
