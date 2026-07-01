//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { translations } from '#translations';
import { CodeProject, SourceFile, Spec } from '#types';

import { CodePlugin } from '../../CodePlugin';
import { CodeArticle } from './CodeArticle';

const HELLO_WORLD = {
  path: 'src/hello.ts',
  content:
    trim`
      //
      // Copyright 2026 DXOS.org
      //

      export const main = (): void => {
        console.log('Hello, World!');
      };

      main();
    ` + '\n',
};

const MULTI_FILE_FILES = [
  {
    path: 'src/util.ts',
    content:
      trim`
        //
        // Copyright 2026 DXOS.org
        //

        export const MESSAGE = 'Hello from util.ts!';
        export const STAMP = (): string => new Date().toISOString();
      ` + '\n',
  },
  {
    path: 'src/hello.ts',
    content:
      trim`
        //
        // Copyright 2026 DXOS.org
        //

        import { MESSAGE, STAMP } from './util';

        console.log(MESSAGE);
        console.log('Generated at', STAMP());
      ` + '\n',
  },
];

const BROKEN_FILES = [
  {
    path: 'src/hello.ts',
    content:
      trim`
        //
        // Copyright 2026 DXOS.org
        //

        // Deliberate type error so Build surfaces a diagnostic.
        export const main = (n: number): void => {
          console.log('starting…');
          throw new Error('boom: deliberate runtime error');
        };

        const value: string = 42;
        main(value);
      ` + '\n',
  },
];

type StoryArgs = {
  seed: ReadonlyArray<{ path: string; content: string }>;
  name: string;
};

const DefaultStory = (_: StoryArgs) => {
  const [space] = useSpaces();
  const [project] = useQuery(space?.db, Filter.type(CodeProject.CodeProject));
  if (!project) {
    return <Loading />;
  }

  return <CodeArticle role='article' subject={project} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-code/containers/CodeArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args: { seed, name } }) => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Spec.Spec, CodeProject.CodeProject, SourceFile.SourceFile, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              const spec = space.db.add(Spec.make());
              const files = seed.map((entry) => space.db.add(SourceFile.make(entry)));
              space.db.add(CodeProject.make({ name, spec, files }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        CodePlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * F-12a path. Single file with no imports — exercises the TypeScript
 * language-service transpile. Press **Build** then **Run** to see "Hello,
 * World!" in the Console pane.
 */
export const HelloWorld: Story = {
  args: {
    seed: [HELLO_WORLD],
    name: 'Hello World',
  },
};

/**
 * F-12b path. Two files with a relative import — exercises esbuild-wasm
 * bundling. Press **Build** then **Run** to see "Hello from util.ts!" plus
 * a timestamp printed via the imported helper.
 */
export const MultiFile: Story = {
  args: {
    seed: MULTI_FILE_FILES,
    name: 'Multi File',
  },
};

/**
 * Pressing **Build** surfaces a type-check error in the Diagnostics pane.
 * **Run** stays disabled because the last build is not clean.
 */
export const BuildError: Story = {
  args: {
    seed: BROKEN_FILES,
    name: 'Build Error',
  },
};

/**
 * Empty project — press the agent in the assistant article to scaffold,
 * or just observe the empty-state UI here.
 */
export const Empty: Story = {
  args: {
    seed: [],
    name: 'Empty',
  },
};
