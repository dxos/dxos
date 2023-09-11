declare module 'race-as-promised' {
  type raceFn = typeof Promise.race;
  declare const race: raceFn;
  export default race;
}