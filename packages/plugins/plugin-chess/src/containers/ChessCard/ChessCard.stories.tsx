//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';

import { meta as pluginMeta } from '../../meta';
import { Chess } from '../../types';

import { ChessCard } from './ChessCard';

const SAMPLE_PGN =
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. d5 Qg5 15. dxe6 Qg4 16. e7 Kf7 17. bxc3 Kg6 *';

// TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
const CardStory = () => {
  const game = useMemo(() => Chess.make({ pgn: SAMPLE_PGN }), []);
  return (
    <CardContainer role='popover' icon={pluginMeta.icon}>
      <ChessCard subject={game} />
    </CardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-chess/ChessCard',
  render: () => <CardStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover: Story = {};
