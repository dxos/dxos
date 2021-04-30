//
// Copyright 2021 DXOS.org
//

export function getStackTrace () {
  try {
    throw new Error();
  } catch (err) {
    return err.stack.split('\n').slice(1).join('\n');
  }
}
