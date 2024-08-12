//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Util.
export const range = <T>(fn: (i: number) => T | undefined, length: number): T[] =>
  Array.from({ length })
    .map((_, i) => fn(i))
    .filter(Boolean) as T[];

export const randomText = (length: number) => {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for (let index = 0; index < length; index++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
