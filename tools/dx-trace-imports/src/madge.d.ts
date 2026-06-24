//
// Copyright 2026 DXOS.org
//

declare module 'madge' {
  interface MadgeConfig {
    baseDir?: string;
    fileExtensions?: string[];
    includeNpm?: boolean;
    tsConfig?: string | object;
    detectiveOptions?: Record<string, Record<string, unknown>>;
  }

  interface MadgeInstance {
    obj(): Record<string, string[]>;
  }

  function madge(path: string, config?: MadgeConfig): Promise<MadgeInstance>;

  export default madge;
}
