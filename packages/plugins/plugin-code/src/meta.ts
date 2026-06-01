//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.code', '0.1.0'),
  name: 'Code',
  author: 'DXOS',
  description: trim`
    Code is the plugin-authoring workbench for DXOS Composer. It pairs a
    structured DEUS spec document (a .mdl file describing types, components,
    operations, and acceptance tests) with a CodeProject that holds the
    TypeScript source tree produced from that spec. Both objects live in ECHO,
    so edits are CRDT-merged and fully reactive — the same space can be shared
    with collaborators or an AI agent without any special sync infrastructure.

    The Coder blueprint drives the authoring loop: the assistant refines the
    spec with the user, then calls the introspect-mcp server to look up live
    DXOS and Composer APIs before writing source files. A full file-CRUD
    operation set (scaffold, list, read, write, delete, reset, helloWorld) is
    exposed as blueprint tools, letting the agent build up a project
    incrementally and correct mistakes without leaving the chat. An Anthropic
    API key can be stored securely as an AccessToken in the user's HALO space
    via the plugin's settings panel.

    The CodeArticle surface renders a two-pane layout: a hierarchical FileTree
    on the left derived from the project's SourceFile paths, and a
    react-ui-editor CodeMirror instance on the right that selects the
    appropriate language mode (TypeScript, Markdown, or plain text) based on
    the selected file's extension. The SpecArticle surfaces the .mdl document
    with dedicated syntax highlighting, linting, and completion extensions so
    the spec itself is pleasant to read and edit by hand.

    An in-browser build pipeline transpiles the project's TypeScript sources
    using a virtual TypeScript environment for single-file projects, and
    esbuild-wasm for multi-file bundles. The buildProject operation returns
    typed diagnostics; runBuild evaluates the emitted JavaScript in a
    console-capturing wrapper and returns stdout and stderr, giving the agent
    a fast verify-and-fix loop without requiring any external build service.
    Remote dispatch to an EDGE build agent is wired as a stub and will be
    activated in a subsequent phase.
  `,
  icon: 'ph--code--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-code',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
