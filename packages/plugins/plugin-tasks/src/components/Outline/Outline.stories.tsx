//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { githubReferences, referenceUrl } from '@dxos/plugin-github/extensions';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { translations } from '#translations';

import { Outline as OutlineComponent } from './Outline.tsx';

const OutlineStory = ({ content = '- [x] Initial content', references, onSelectLink }: StoryArgs) => {
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
      <OutlineComponent.Root id={text.id} text={text} extensions={extensions} onSelectLink={onSelectLink}>
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
  /** Called when a promoted item's link is followed. */
  onSelectLink?: (url: string) => void;
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

const LINK_LABEL = 'Draft the plan';
const LINK_DXN = 'eid:echo:@:01JXAMPLE0000000000000000';

/**
 * A promoted item's link is followed on click or Enter, never on hover: hovering the chip is the
 * preview popover's cue (the chip's `DxAnchorActivate` reaches the window), and following the link
 * there swapped the outline for the task under the pointer.
 */
export const TestLinkActivation: Story = {
  args: {
    content: `- [x] [${LINK_LABEL}](${LINK_DXN})\n- [ ] Another item`,
    onSelectLink: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const { page } = await import('@vitest/browser/context');
    const canvas = within(canvasElement);
    const anchor = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>(`dx-anchor[eid="${LINK_DXN}"]`);
      if (!element) {
        throw new Error('No anchor chip');
      }
      return element;
    });

    // The chip's own activation still reaches the window, where the app's preview popover listens.
    const activations: string[] = [];
    const listen = (event: Event) => activations.push(String((event as { state?: boolean }).state ?? 'open'));
    window.addEventListener('dx-anchor-activate', listen, { capture: true });

    await page.getByText(LINK_LABEL).hover();
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(args.onSelectLink).not.toHaveBeenCalled();
    await expect(activations).toContain('open');
    await expect(canvas.getByText('Another item')).toBeVisible();

    await userEvent.click(anchor);
    await expect(args.onSelectLink).toHaveBeenCalledWith(LINK_DXN);
    await expect(args.onSelectLink).toHaveBeenCalledTimes(1);

    anchor.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelectLink).toHaveBeenCalledTimes(2);
    window.removeEventListener('dx-anchor-activate', listen, { capture: true });
  },
};
