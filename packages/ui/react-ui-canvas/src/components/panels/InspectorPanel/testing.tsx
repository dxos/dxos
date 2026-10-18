//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { InspectorPanel, InspectorSection, type InspectorSectionDef } from './InspectorPanel.tsx';

export type InspectorFrameProps = PropsWithChildren<{ section: InspectorSectionDef }>;

/** One inspector as the canvas shows it: in its section of a docked inspector panel, with its title and disclosure. */
export const InspectorFrame = ({ section, children }: InspectorFrameProps) => (
  <InspectorPanel.Root docked>
    <InspectorSection section={section}>{children}</InspectorSection>
    <InspectorPanel.Content />
  </InspectorPanel.Root>
);

/** Renders a story's inspector inside an `InspectorFrame`. */
export const withInspectorFrame =
  (section: InspectorSectionDef): Decorator =>
  (Story) => (
    <InspectorFrame section={section}>
      <Story />
    </InspectorFrame>
  );
