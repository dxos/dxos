/**
 * Evaluate the script.
 */
//
// Copyright 2025 DXOS.org
//

const evalScript = (code: string, deps: Record<string, any> = {}) => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(...Object.keys(deps), 'return ' + code)(...Object.values(deps));
};
