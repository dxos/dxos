//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';

const makeKey = (name: string) => DXN.make(`org.dxos.operation.debug.${name}`);

/**
 * Fills the document with placeholder prose from the slash menu — the cheapest way to get a
 * realistic amount of text in front of a layout or scrolling bug.
 */
export const InsertLoremIpsum = Operation.make({
  meta: {
    key: makeKey('insertLoremIpsum'),
    name: 'Lorem ipsum',
    description: 'Inserts a paragraph of placeholder text at the cursor.',
    icon: 'ph--text-align-left--regular',
  },
  input: MarkdownOperation.EditorCommandInput,
  output: Schema.Void,
  // The handler resolves the live EditorView from a capability, which is the only route from the
  // operation layer to the editor.
  services: [Capability.Service],
});
