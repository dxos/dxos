//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import * as Splitter from '@dxos/react-ui/Splitter';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';

// The components index loads first, so its modules initialize before the parts imported directly below.
import { useComputeGraph } from '#components';

import { SheetContent } from '../components/SheetContent/index.ts';
import { SheetRoot } from '../components/SheetRoot/index.ts';
import { type TestSheetProps, useTestSheet } from './testing.tsx';

/** Which panes show: the sheet, both, or the companion. */
export type SheetCompanionFrameMode = 'start' | 'split' | 'end';

const MODES: readonly SheetCompanionFrameMode[] = ['start', 'split', 'end'];

export type SheetCompanionFrameProps = {
  /** The test sheet's contents. */
  sheet: TestSheetProps;
  /** Rendered inside the sheet's root, so it can read the model with `useSheetContext`. */
  companion: ReactNode;
  /** Names the companion pane in the view switch. */
  label: string;
  icon: string;
  mode?: SheetCompanionFrameMode;
  /** The companion pane's initial width in rem; half the frame without one. */
  size?: number;
};

/**
 * A test sheet beside a companion in a resizable splitter, as the app shows a companion beside its article;
 * the toolbar switches between the sheet, both, and the companion alone.
 */
export const SheetCompanionFrame = ({
  sheet: sheetProps,
  companion,
  label,
  icon,
  mode: initialMode = 'split',
  size,
}: SheetCompanionFrameProps) => {
  const [mode, setMode] = useState<SheetCompanionFrameMode>(initialMode);

  const [space] = useSpaces();
  const graph = useComputeGraph(space);
  const sheet = useTestSheet(space, graph, sheetProps);

  // The splitter sizes in rem, so an even split is measured from the frame once it is laid out.
  const frameRef = useRef<HTMLDivElement>(null);
  const [defaultSize, setDefaultSize] = useState(size);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (size === undefined && frame) {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      setDefaultSize(frame.getBoundingClientRect().width / 2 / rem);
    }
  }, [size, sheet]);
  if (!sheet || !graph) {
    return null;
  }

  return (
    <SheetRoot graph={graph} sheet={sheet} attendableId='test' ignoreAttention>
      <div ref={frameRef} className='grid grid-rows-[min-content_1fr] dx-fill'>
        <div className='flex p-1 border-b border-separator'>
          <ToggleGroup.Root
            type='single'
            value={mode}
            onValueChange={(value: string) => setMode((mode) => MODES.find((candidate) => candidate === value) ?? mode)}
            aria-label='View'
          >
            <ToggleGroup.Item value='start' icon='ph--grid-nine--regular' label='Sheet' />
            <ToggleGroup.Item value='split' icon='ph--columns--regular' label='Split' />
            <ToggleGroup.Item value='end' icon={icon} label={label} />
          </ToggleGroup.Root>
        </div>
        <Splitter.Root
          // Remounts once the even split is measured, since the default only applies on mount.
          key={defaultSize === undefined ? 'unmeasured' : 'measured'}
          orientation='horizontal'
          mode={mode}
          onModeChange={setMode}
          anchor='end'
          defaultSize={defaultSize}
          minSize={16}
          resizable
        >
          <Splitter.Panel position='start' classNames='grid overflow-hidden'>
            <SheetContent />
          </Splitter.Panel>
          <Splitter.ResizeTrigger aria-label={`Resize ${label.toLowerCase()}`} />
          <Splitter.Panel position='end' classNames='grid overflow-hidden border-l border-separator'>
            {companion}
          </Splitter.Panel>
        </Splitter.Root>
      </div>
    </SheetRoot>
  );
};
