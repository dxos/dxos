//
// Copyright 2026 DXOS.org
//

// `@vscode/vsce` ships no type declarations; this is the part of its API `package.ts` calls.
declare module '@vscode/vsce' {
  export type PackageOptions = {
    /** The extension folder; defaults to the working directory. */
    cwd?: string;
    /** Where to write the `.vsix`. */
    packagePath?: string;
    /** False skips `npm list`, for an extension whose bundle carries its dependencies. */
    dependencies?: boolean;
    skipLicense?: boolean;
  };

  export const createVSIX: (options?: PackageOptions) => Promise<unknown>;
}
