//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { diagramBlockDescription, diagramPreview } from '@dxos/diagram/extension';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { trim } from '@dxos/util';

type StoryArgs = {
  text: string;
};

/**
 * A markdown document in the editor the markdown plugin builds, with the extension this plugin contributes to it.
 *
 * 1. Each `diagram` fence draws as a diagram in place of its source.
 * 2. Switch the storybook theme: the diagram redraws in the other palette, on the editor's own surface.
 * 3. Click a diagram: its source shows, with the diagram below it; click away and the source folds again.
 */
const DefaultStory = ({ text }: StoryArgs) => {
  const themeMode = Hooks.useThemeMode();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: text,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ codeLanguages: [diagramBlockDescription] }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        diagramPreview(),
        decorateMarkdown(),
      ],
    }),
    [themeMode, text],
  );

  return <div {...focusAttributes} ref={parentRef} />;
};

const meta = {
  title: 'plugins/plugin-canvas/capabilities/markdown-extension',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: trim`
      # Runtime

      Processes run locally and spawn children on EDGE:

      \`\`\`diagram
      diagram flow=down
      group local "Local runtime" {
        node PM "ProcessManager"
        node Invoker "ProcOpInvoker" right-of PM
        node Store "ProcessStore" below PM
      }
      group remote "EDGE runtime" right-of local {
        node RPM "RemoteProcessMgr"
      }
      edge PM owns Store "persist"
      edge PM -> Invoker
      edge Invoker -> PM "spawn child"
      edge PM -> RPM:top "spawn on EDGE"
      \`\`\`

      The same document, in the same theme as the text around it.

      \`\`\`diagram
      diagram flow=right
      node A "Alpha"
      node B "Beta"
      node C "Gamma"
      edge A -> B "calls"
      edge B implements C
      \`\`\`

    `,
  },
};

/** A fence that does not parse reports its problem where the diagram would be. */
export const Invalid: Story = {
  args: {
    text: trim`
      # Broken

      \`\`\`diagram
      # nothing here
      \`\`\`

    `,
  },
};
