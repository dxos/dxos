//
// Copyright 2025 DXOS.org
//

import { AnimatePresence } from 'motion/react';
import React, { useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName, useStateWithRef } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import {
  type StepOptions,
  Steps,
  type StepSlots,
  type StepState,
  defaultStepOptions,
  defaultStepSlots,
} from '../Progress';

// TODO(burdon): Show predicted nodes faded out.
// TODO(burdon): Allow controlled index (like TextBlock).

export type ProgressBarProps = ThemedClassName<{
  nodes?: { id: string }[];
  index?: number;
  active?: boolean;
  classes?: StepSlots;
  options?: StepOptions;
  onSelect?: (node: { index: number; id: string }) => void;
}>;

/**
 * Progress over an UNBOUNDED run — steps arrive as the work takes them, and only the tail that fits
 * is drawn. A run with a known plan uses `Steps` with `planSteps` instead; both render the same
 * primitive, and differ only in how each step's state is derived.
 *
 * ---O---O---O---((O))
 */
export const ProgressBar = ({
  nodes,
  index,
  active,
  classNames,
  classes = defaultStepSlots,
  options = defaultStepOptions,
  onSelect,
}: ProgressBarProps) => {
  const { ref, width } = useResizeDetector();
  const [_, setCurrent, currentRef] = useStateWithRef<number>(nodes?.length ?? 0);
  useEffect(() => {
    setCurrent(nodes?.length ?? 0);
  }, [nodes?.length]);

  const maxNodes = Math.floor((width ?? 0) / options.width);
  const visibleNodes = nodes?.slice(-maxNodes) ?? [];
  const baseIndex = (nodes?.length ?? 0) - visibleNodes.length;

  const steps = visibleNodes.map((node, i) => ({
    id: node.id,
    selected: baseIndex + i === index,
    state: (baseIndex + i === currentRef.current! - 1
      ? active
        ? 'active'
        : 'terminal'
      : i < currentRef.current!
        ? 'open'
        : 'closed') as StepState,
  }));

  return (
    <AnimatePresence>
      <div className={mx('flex items-center w-full h-[32px] overflow-hidden', classNames)} ref={ref}>
        <Steps steps={steps} classes={classes} options={options} onSelect={onSelect} />
      </div>
    </AnimatePresence>
  );
};
