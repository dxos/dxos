//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import * as Layout from '@dxos/react-ui/Layout';
import { withTheme } from '@dxos/react-ui/testing';
import * as Typography from '@dxos/react-ui/Typography';
import { Person } from '@dxos/types';

import { CollaborativeTextEditor } from './CollaborativeTextEditor.tsx';

type StoryArgs = { multiline?: boolean };

/** An editor bound to a person's name, with the stored name below it. */
const DefaultStory = ({ multiline }: StoryArgs) => {
  const { space } = useClientStory();
  const [person] = useQuery(space?.db, Filter.type(Person.Person));
  const [fullName] = useObject(person, 'fullName');
  return (
    <Layout.Container>
      {person && <CollaborativeTextEditor object={person} path={['fullName']} multiline={multiline} testId='editor' />}
      <Typography.Text data-testid='stored'>{fullName}</Typography.Text>
    </Layout.Container>
  );
};

const meta = {
  title: 'ui/react-ui-form/CollaborativeTextEditor',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withClientProvider({
      types: [Person.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        space.db.add(Obj.make(Person.Person, { fullName: 'Alice' }));
      },
    }),
  ],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiline: Story = { args: { multiline: true } };

/** Typing writes through to the object, and Enter leaves a one-line editor rather than breaking the line. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The client creates its space asynchronously, which is slow under full-suite load.
    const editor = await canvas.findByTestId('editor', {}, { timeout: 15_000 });
    await waitFor(() => expect(editor).toHaveTextContent('Alice'));
    const content = editor.querySelector<HTMLElement>('.cm-content');
    invariant(content, 'Missing editor content.');
    await userEvent.click(content);
    await userEvent.keyboard('{End} Carroll{Enter}');
    await waitFor(() => expect(canvas.getByTestId('stored')).toHaveTextContent('Alice Carroll'));
    await expect(editor.querySelectorAll('.cm-line')).toHaveLength(1);
    await expect(content).not.toHaveFocus();
  },
};
