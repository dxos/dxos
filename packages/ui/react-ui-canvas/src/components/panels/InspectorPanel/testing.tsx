//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React, { type PropsWithChildren, useState } from 'react';

import { InspectorPanel, InspectorSection, type InspectorSectionDef } from './InspectorPanel.tsx';

export type InspectorFrameProps = PropsWithChildren<{ section: InspectorSectionDef }>;

/**
 * One inspector as the canvas shows it: in its section of an inspector panel, docked to start with, whose toolbar
 * floats and docks it.
 */
export const InspectorFrame = ({ section, children }: InspectorFrameProps) => {
  const [docked, setDocked] = useState(true);
  return (
    <InspectorPanel.Root docked={docked} onDockedChange={setDocked}>
      <InspectorSection section={section}>{children}</InspectorSection>
      <InspectorPanel.Content />
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
