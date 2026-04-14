/**
 * yargs 16 ships `yargs/helpers` without bundled types; `@types/yargs` does not cover this subpath.
 */
declare module 'yargs/helpers' {
  export function hideBin(argv: string[]): string[];
}
