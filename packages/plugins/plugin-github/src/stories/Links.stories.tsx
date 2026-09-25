//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { PreviewEvents } from '@dxos/plugin-preview';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { corePlugins } from '@dxos/plugin-testing';
import { Card, Icon, Popover, useThemeContext } from '@dxos/react-ui';
import {
  EditorPreviewProvider,
  type EditorPreviewProviderProps,
  useEditorPreview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { GitHubPlugin } from '#plugin';

import { githubLinks } from '../extensions/index.ts';
import { FixtureLinkSourcePlugin } from '../testing/index.ts';

/** The popover's card is whatever `CardContent` surface the resolved object's type has — this plugin's, for a PR or issue. */
const PreviewCard = () => {
  const { target } = useEditorPreview('PreviewCard');
  if (!target?.object) {
    return null;
  }
  return (
    <Popover.Portal>
      <Popover.Content
        onOpenAutoFocus={(event) => event.preventDefault()}
        classNames={[
          'origin-(--transform-origin)',
          'data-[state=open]:animate-popover-in',
          'data-[state=closed]:animate-popover-out',
        ]}
      >
        <Popover.Viewport>
          <Card.Root border={false} classNames='dx-card-popover'>
            <Card.Header>
              <Card.Block>
                <Icon icon={Obj.getIcon(target.object)?.icon ?? 'ph--circle-dashed--regular'} />
              </Card.Block>
              <Card.Title>{Obj.getLabel(target.object) ?? target.label}</Card.Title>
              <Popover.Close asChild>
                <Card.ActionIconButton action='close' />
              </Popover.Close>
            </Card.Header>
            <Surface.Surface type={AppSurface.CardContent} data={{ subject: target.object }} limit={1} />
          </Card.Root>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

type StoryArgs = {
  text: string;
};

/**
 * The whole mechanism end to end: `githubLinks()` turns the URLs into anchor chips, the chips'
 * activation goes to the contributed `LinkResolver`s, and the resolved object's `CardContent`
 * surface renders the card.
 */
const DefaultStory = ({ text }: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const resolvers = useCapabilities(PreviewCapabilities.LinkResolver);
  const handleLookup = useCallback<NonNullable<EditorPreviewProviderProps['onLookup']>>(
    async (ref) => {
      for (const { match, resolve } of resolvers.flat()) {
        if (!match(ref.eid)) {
          continue;
        }
        const target = await EffectEx.runPromise(resolve(ref, {}));
        if (target) {
          return target;
        }
      }
      return undefined;
    },
    [resolvers],
  );
  const extensions = useMemo(
    () => [
      createThemeExtensions({ themeMode }),
      createBasicExtensions({ lineWrapping: true }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      githubLinks(),
    ],
    [themeMode],
  );
  const { parentRef } = useTextEditor({ initialValue: text, extensions }, [extensions]);

  return (
    <EditorPreviewProvider onLookup={handleLookup}>
      <div ref={parentRef} className='dx-fill p-4 overflow-auto' />
      <PreviewCard />
    </EditorPreviewProvider>
  );
};

const meta = {
  title: 'plugins/plugin-github/stories/Links',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // No PreviewPlugin: its popover module would answer the anchors too, through the deck's layout
    // operation, which has no handler here. The start event alone activates this plugin's resolver.
    withPluginManager({
      plugins: [...corePlugins(), GitHubPlugin(), FixtureLinkSourcePlugin()],
      setupEvents: [PreviewEvents.Start],
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: trim`
      # Repositories, pull requests and issues

      The drawer landed in [#13007](https://github.com/dxos/dxos/pull/13007), the Main port in
      [#13024](https://github.com/dxos/dxos/pull/13024) and [#13030](https://github.com/dxos/dxos/pull/13030).

      Issues too: [#1](https://github.com/dxos/dxos/issues/1), and [the repository](https://github.com/dxos/dxos)
      itself. A page below the repository is not an object: [the readme](https://github.com/dxos/dxos/blob/main/README.md).
    `,
  },
};
