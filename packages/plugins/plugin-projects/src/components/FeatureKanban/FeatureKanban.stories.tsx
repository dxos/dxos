//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { type FeatureChanges, type FeatureModel, type FeatureStatus } from '../FeatureCard/index.ts';
import { SAMPLE_FEATURES } from '../FeatureCard/testing.ts';
import { FeatureKanban } from './FeatureKanban.tsx';

/** Holds the features in state, so a drop that sets a status moves the card as the operation would. */
const DefaultStory = ({ features: initial }: { features: FeatureModel[] }) => {
  const [features, setFeatures] = useState(initial);
  const handleChange = (id: string, changes: FeatureChanges) =>
    setFeatures((features) => features.map((feature) => (feature.id === id ? { ...feature, ...changes } : feature)));
  return <FeatureKanban features={features} onChange={handleChange} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-projects/components/FeatureKanban',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withMosaic(), withRegistry],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: { features: SAMPLE_FEATURES },
};

export default meta;

type Story = StoryObj<typeof meta>;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const dispatchDrag = (element: HTMLElement, type: string, dataTransfer: DataTransfer) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  element.dispatchEvent(
    new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: x + width / 2,
      clientY: y + height / 2,
    }),
  );
};

const column = (canvasElement: HTMLElement, status: FeatureStatus) => {
  const element = canvasElement.querySelector<HTMLElement>(`[data-testid="board-column"][data-status="${status}"]`);
  if (!element) {
    throw new Error(`no column for ${status}`);
  }
  return element;
};

const cardIn = (canvasElement: HTMLElement, status: FeatureStatus, id: string) =>
  column(canvasElement, status)
    .querySelector<HTMLElement>(`[data-feature="${id}"]`)
    ?.closest<HTMLElement>('[draggable]');

/** A column per status; dropping a card on another column sets its feature's status. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(cardIn(canvasElement, 'planned', 'triage')).toBeTruthy(), { timeout: 10_000 });
    await expect(canvasElement.querySelectorAll('[data-testid="board-column"]')).toHaveLength(4);

    const source = cardIn(canvasElement, 'planned', 'triage');
    const target = column(canvasElement, 'prototype').querySelector<HTMLElement>('[data-mosaic-container-state]');
    if (!source || !target) {
      throw new Error('missing drag source or target');
    }
    const dataTransfer = new DataTransfer();
    dispatchDrag(source, 'dragstart', dataTransfer);
    let dropped = false;
    try {
      // pragmatic-dnd starts the drag a frame after `dragstart`, once the native preview has been taken.
      await nextFrame();
      await nextFrame();
      dispatchDrag(target, 'dragenter', dataTransfer);
      dispatchDrag(target, 'dragover', dataTransfer);
      await waitFor(() => expect(target.dataset.mosaicContainerState).toBe('active'), { timeout: 5_000 });
      dispatchDrag(target, 'drop', dataTransfer);
      dropped = true;
    } finally {
      dropped || dispatchDrag(source, 'dragend', dataTransfer);
    }
    await waitFor(() => expect(cardIn(canvasElement, 'prototype', 'triage')).toBeTruthy(), { timeout: 5_000 });
    await expect(cardIn(canvasElement, 'planned', 'triage')).toBeFalsy();
  },
};

/** Selection follows focus across columns: the arrow keys move it, and Escape clears it. */
export const Selection: Story = {
  play: async ({ canvasElement }) => {
    const card = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-feature="${id}"]`);
    const selected = () =>
      [...canvasElement.querySelectorAll('[aria-selected="true"]')].map((element) =>
        element.getAttribute('data-feature'),
      );
    await waitFor(() => expect(card('triage')).toBeTruthy(), { timeout: 10_000 });
    const triage = card('triage');
    if (!triage) {
      throw new Error('no card for triage');
    }
    await userEvent.click(triage);
    await waitFor(() => expect(selected()).toEqual(['triage']));
    // Planned -> Prototype: the next column's card is selected, and the rest fade.
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(selected()).toEqual(['sync']));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(selected()).toEqual([]));
  },
};
