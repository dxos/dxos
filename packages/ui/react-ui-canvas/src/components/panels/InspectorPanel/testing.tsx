//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React, { type PropsWithChildren, useState } from 'react';

import { InspectorPanel, InspectorSection, type InspectorSectionDef } from './InspectorPanel.tsx';

export type InspectorFrameProps = PropsWithChildren<{ section: InspectorSectionDef }>;

/**
 * One inspector as the canvas shows it: in its section of an inspector panel, floating (the canvas's default) over a box
 * the size of a small canvas; the panel's toolbar docks and floats it.
 */
export const InspectorFrame = ({ section, children }: InspectorFrameProps) => {
  const [docked, setDocked] = useState(false);
  return (
    <InspectorPanel.Root docked={docked} onDockedChange={setDocked}>
      <InspectorSection section={section}>{children}</InspectorSection>
      <div className='relative flex justify-end w-[28rem] h-[32rem]'>
        <InspectorPanel.Content />
      </div>
    </InspectorPanel.Root>
  );
};

/** Renders a story's inspector inside an `InspectorFrame`. */
export const withInspectorFrame =
  (section: InspectorSectionDef): Decorator =>
  (Story) => (
    <InspectorFrame section={section}>
      <Story />
    </InspectorFrame>
  );
