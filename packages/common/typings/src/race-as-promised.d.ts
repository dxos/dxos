//
// Copyright 2025 DXOS.org
//

declare module 'race-as-promised' {
  // https://github.com/digitalloggers/race-as-promised/pull/4
  type raceFn = typeof Promise.race;
  declare const race: raceFn;
  export default race;
}
