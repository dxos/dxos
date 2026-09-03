//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { githubReferences, referenceUrl } from '@dxos/plugin-github/extensions';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { translations } from '#translations';

import { Outline as OutlineComponent } from './Outline.tsx';

const OutlineStory = ({ content = '- [x] Initial content', references }: StoryArgs) => {
  const [space] = useSpaces();
  const text = useMemo(() => {
    if (space) {
      return space.db.add(Text.make({ content }));
    }
    return undefined;
  }, [space, content]);
  // The outline owns its core extensions; a host adds what only it knows about. Here that is
  // plugin-github's `#123` decoration, which in the app resolves against the project's repository.
  const extensions = useMemo(
    () => (references ? [githubReferences({ resolve: (number) => referenceUrl(references, number) })] : undefined),
    [references],
  );
  if (text) {
    return (
      <OutlineComponent.Root id={text.id} text={text} extensions={extensions}>
        <OutlineComponent.Content />
      </OutlineComponent.Root>
    );
  }
  return null;
};

type StoryArgs = {
  content?: string;
  /** `owner/repo` a `#123` reference resolves against; unset leaves references undecorated. */
  references?: string;
};

const meta = {
  title: 'plugins/plugin-tasks/components/Outline',
  component: OutlineStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    // TODO(burdon): Create a storybook without the database.
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Text.Text, Outline.Outline],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof OutlineStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * `#123` resolves to an issue or pull request in the repository the host names — the decoration
 * plugin-github contributes, which the project article wires up from `Project.repo`.
 */
export const WithReferences: Story = {
  args: {
    content: '- [ ] Review #12752 before the release\n- [ ] Not a reference: #tag, #ff0000',
    references: 'dxos/dxos',
  },
};
