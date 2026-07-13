//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { VariantGallery, type VariantTileSource } from './VariantGallery';

import { translations } from '../../translations';

const variants: VariantTileSource[] = Array.from({ length: 8 }, (_, index) => ({
  id: `variant-${index}`,
  contentType: 'image/png',
  url: `https://picsum.photos/seed/studio-${index}/${400 + (index % 3) * 60}/${360 + (index % 4) * 40}`,
  label: `Variant ${index + 1}`,
}));

const meta: Meta = {
  title: 'plugins/plugin-studio/components/VariantGallery',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <VariantGallery variants={variants} />,
};

export const Selectable: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
    return (
      <VariantGallery
        variants={variants}
        selectedIds={selectedIds}
        onSelect={(id) =>
          setSelectedIds((current) => {
            const next = new Set(current);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })
        }
      />
    );
  },
};

export const Empty: Story = {
  render: () => <VariantGallery variants={[]} />,
};
