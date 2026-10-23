//
// Copyright 2026 DXOS.org
//

import type { Connect, Plugin } from 'vite';

import * as CodeIndexMiddleware from './CodeIndexMiddleware.ts';

export type CodeIndexVitePluginOptions = Omit<CodeIndexMiddleware.MakeOptions, 'root'> & {
  /** The repository whose index is served; defaults to the directory the vite process was started in. */
  root?: string;
};

/**
 * Serves the code index to the page under `vite dev` (and so under `tauri dev`, whose webview loads the dev server).
 * `apply: 'serve'` keeps it out of a production build, where there is no server to mount it on.
 */
export const CodeIndexVitePlugin = ({ root = process.cwd(), ...options }: CodeIndexVitePluginOptions = {}): Plugin => {
  const mount = (server: {
    config: { server: { allowedHosts?: string[] | true } };
    middlewares: Connect.Server;
    httpServer: { on: (event: 'close', listener: () => void) => unknown } | null;
  }) => {
    // The dev server's own host allowlist, so a setup that serves the app under a custom domain reaches the index too.
    const middleware = CodeIndexMiddleware.make({ root, allowedHosts: server.config.server.allowedHosts, ...options });
    server.middlewares.use(middleware);
    // The MCP child holds the index's store lock, so it goes with the dev server.
    server.httpServer?.on('close', () => middleware.close());
  };
  return {
    name: 'dx-code-index',
    apply: 'serve',
    configureServer: (server) => mount(server),
  };
};
