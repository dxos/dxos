//
// Copyright 2025 DXOS.org
//

import { useEffect } from '@preact-signals/safe-react/react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName, useStateWithRef } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// TODO(burdon): Show predicted nodes faded out.
// TODO(burdon): Allow controlled index (like TextBlock).
// TODO(burdon): Handle error.

export type ProgressBarProps = ThemedClassName<
  {
    nodes?: { id: string }[];
    index?: number;
    active?: boolean;
    onSelect?: (node: { index: number; id: string }) => void;
  } & Partial<Pick<NodeProps, 'classes' | 'options'>>
>;

/**
 * Dynamic progress bar.
 *
 * ---O---O---O---((O))
 */
export const ProgressBar = ({
  nodes,
  index,
  active,
  classNames,
  classes = defaultSlots,
  options = defaultOptions,
  onSelect,
  ...props
}: ProgressBarProps) => {
  const { ref, width } = useResizeDetector();
  const [_, setCurrent, currentRef] = useStateWithRef<number>(nodes?.length ?? 0);
  useEffect(() => {
    setCurrent(nodes?.length ?? 0);
  }, [nodes?.length]);

  const maxNodes = Math.floor((width ?? 0) / options.width);
  const visibleNodes = nodes?.slice(-maxNodes);
  const baseIndex = (nodes?.length ?? 0) - (visibleNodes?.length ?? 0);

  return (
    <AnimatePresence>
      <div role='none' className={mx('flex items-center is-full bs-[32px] overflow-hidden', classNames)} ref={ref}>
        <div className='flex'>
          {visibleNodes?.map((node, i) => (
            <Node
              {...props}
              key={node.id}
              classes={classes}
              selected={baseIndex + i === index}
              state={
                baseIndex + i === currentRef.current! - 1
                  ? active
                    ? 'active'
                    : 'terminal'
                  : i < currentRef.current!
                    ? 'open'
                    : 'closed'
              }
              onClick={() => onSelect?.({ index: baseIndex + i, id: node.id })}
            />
          ))}
        </div>
      </div>
    </AnimatePresence>
  );
};

type NodeState = 'closed' | 'open' | 'active' | 'terminal' | 'error';

type Slots = Partial<Record<NodeState | 'default' | 'selected', string>>;

const defaultSlots = {
  default: 'bg-baseSurface border-subduedSeparator',
  active: 'bg-amber-500 border-transparent text-amber-500',
  terminal: 'bg-primary-500 border-transparent',
  selected: 'bg-neutral-500 border-transparent',
  error: 'bg-rose-500 border-transparent',
};

type NodeOptions = {
  width: number;
  radius: number;
  duration: number;
};

const defaultOptions: NodeOptions = {
  width: 32,
  radius: 7.5,
  duration: 250,
};

type NodeProps = {
  state?: NodeState;
  selected?: boolean;
  classes?: Slots;
  options?: NodeOptions;
  onClick?: () => void;
};

/**
 * ---(O)
 */
const Node = ({ state = 'open', selected, classes, options = defaultOptions, onClick }: NodeProps) => {
  const { width, radius, duration } = options;
  return (
    <motion.div
      transition={{
        duration: duration / 1_000,
      }}
      animate={state}
      initial={{
        width: state === 'closed' ? 0 : width,
      }}
      variants={{
        closed: {
          width: 0,
        },
        open: {
          width,
        },
      }}
    >
      <div className='relative flex flex-1 items-center'>
        <motion.div
          transition={{
            duration: duration / 1_000,
          }}
          animate={state === 'closed' ? 'closed' : 'open'}
          initial={{
            width: state === 'closed' ? 0 : width - radius,
          }}
          variants={{
            closed: {
              width: 0,
            },
            open: {
              width: width - radius,
            },
          }}
          className={mx('absolute left-0 border-be border-subduedSeparator box-border', state === 'closed' && 'hidden')}
        />
        <motion.div
          transition={{
            duration: duration / 1_000,
          }}
          animate={state === 'closed' ? 'closed' : 'open'}
          initial={{
            width: state === 'closed' ? 0 : radius * 2,
            height: state === 'closed' ? 0 : radius * 2,
          }}
          variants={{
            closed: {
              width: 0,
              height: 0,
            },
            open: {
              width: radius * 2,
              height: radius * 2,
            },
          }}
          className={mx('flex absolute right-0', state === 'closed' && 'hidden')}
        >
          <div
            className={mx(
              'absolute border rounded-full transition-all duration-500',
              state === 'active' ? 'inset-[4px]' : 'inset-0',
              onClick && 'cursor-pointer',
              selected ? classes?.selected : (classes?.[state] ?? classes?.default),
            )}
            onClick={onClick}
          />
          {state === 'active' && (
            <Notch classNames={['absolute inset-0 is-full bs-full animate-spin', classes?.active, '!bg-transparent']} />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

const Notch = ({ classNames }: ThemedClassName) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' className={mx(classNames)}>
    <circle
      cx='128'
      cy='128'
      r='108'
      strokeDasharray='500 800'
      strokeDashoffset='0'
      fill='none'
      strokeWidth='40'
      stroke='currentColor'
    />
  </svg>
);
