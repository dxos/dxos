import { Plugin } from "esbuild";

export type ExternalsPluginParams = {
  exclude: string[];
}

export const externalsPlugin = (params: ExternalsPluginParams): Plugin => ({
  name: "externals",
  setup: (build) => {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (params.exclude.includes(args.path)) {
        return { path: args.path, external: true };
      }
    });
  }
})