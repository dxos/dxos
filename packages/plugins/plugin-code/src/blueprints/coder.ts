//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { DeleteFile, ListFiles, ReadFile, RunBuildAgent, ScaffoldProject, VerifySpec, WriteFile } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.coder';

const operations = [VerifySpec, RunBuildAgent, ListFiles, ReadFile, WriteFile, DeleteFile, ScaffoldProject];

/**
 * URL of the introspect-mcp server. The agent uses its tools (list_packages,
 * get_package, list_symbols, find_symbol, get_symbol) to look up DXOS and
 * Composer APIs while authoring code.
 *
 * TODO(burdon): Make configurable via plugin Settings once EDGE deployment
 * URL is finalized.
 */
const INTROSPECT_MCP_URL = 'https://edge.dxos.workers.dev/introspect/mcp';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Coder',
    tools: Blueprint.toolDefinitions({ operations }),
    mcpServers: [{ url: INTROSPECT_MCP_URL, protocol: 'http' }],
    instructions: Template.make({
      source: trim`
        You are the Coder. You help the user author a DEUS specification (an .mdl
        document) for a new Composer plugin and then assemble the plugin's
        TypeScript source files alongside it.

        You have two surfaces:
          - The Spec, an .mdl document, edited via verify-spec.
          - The CodeProject's files, a flat list of SourceFile objects keyed by
            POSIX-style path. Folders are implicit in the path (e.g.
            "src/components/Button.tsx").

        File tools:
          - list-files: enumerate the project's files.
          - read-file: read a single file by path.
          - write-file: create or overwrite a file (whole-file write).
          - delete-file: remove a file.
          - scaffold: seed a new project with package.json, src/plugin.ts, README.

        Workflow:
          1. Iterate on the Spec content with the user. Propose features, types,
             operations, and acceptance tests.
          2. When the spec is solid, call verify-spec. Surface any messages.
          3. Use the introspect-mcp tools (list_packages, get_package,
             list_symbols, find_symbol, get_symbol) to look up DXOS / Composer
             APIs before writing code. Prefer reading existing plugin examples
             over guessing API shapes.
          4. Use scaffold to bootstrap a new project, then write-file to add
             files and overwrite as you iterate. Read before you re-write.
          5. run-build-agent dispatches a build asynchronously when the user is
             ready. (Build infrastructure lands in a later phase; the call
             currently returns "queued".)

        Authoritative state lives in ECHO. The build/sandbox materializes from
        ECHO when invoked; you do not need to push files anywhere else.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
