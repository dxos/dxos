//
// Copyright 2025 DXOS.org
//

import { useEffect } from '@preact-signals/safe-react/react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

import { type ThemedClassName, useStateWithRef } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ProgressProps = ThemedClassName<{
  nodes?: { id: string }[];
  active?: boolean;
  classes?: NodeProps['classes'];
}>;

/**
 * Dynamic progress bar.
 *
 * ---O---O---O---((O))
 */
export const Progress = ({ nodes, active, classNames, classes = defaultSlots }: ProgressProps) => {
  const [_, setCurrent, currentRef] = useStateWithRef<number>(nodes?.length ?? 0);
  useEffect(() => {
    setCurrent(nodes?.length ?? 0);
  }, [nodes?.length]);

  return (
    <AnimatePresence>
      <div role='none' className={mx('flex items-center is-full bs-[32px] overflow-hidden', classNames)}>
        <div className='flex'>
          {nodes?.map((node, i) => (
            <Node
              key={node.id}
              state={
                i === currentRef.current! - 1
                  ? active
                    ? 'active'
                    : 'terminal'
                  : i < currentRef.current!
                    ? 'open'
                    : 'closed'
              }
              classes={classes}
            />
          ))}
        </div>
      </div>
    </AnimatePresence>
  );
};

type NodeState = 'closed' | 'open' | 'active' | 'terminal';

type Slots = Partial<Record<NodeState | 'default', string>>;

const defaultSlots = {
  default: 'bg-baseSurface',
  active: 'bg-rose-500',
  terminal: 'bg-green-500',
};

type NodeProps = {
  state?: NodeState;
  width?: number;
  radius?: number;
  duration?: number;
  classes: Slots;
  onClick?: () => void;
};

/**
 * ---(O)
 */
const Node = ({ state = 'open', width = 32, radius = 8, duration = 250, classes, onClick }: NodeProps) => {
  return (
    <motion.div
      transition={{
        duration: duration / 1000,
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
          className={mx('absolute left-0 border border-subduedSeparator box-border', state === 'closed' && 'hidden')}
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
          className={mx('absolute right-0', state === 'closed' && 'hidden')}
        >
          <div
            className={mx(
              'absolute inset-0 border border-separator box-border rounded-full',
              state === 'active' && 'animate-ping',
            )}
          />
          <div
            className={mx(
              'absolute inset-0 border border-subduedSeparator box-border rounded-full transition-background duration-500',
              onClick && 'cursor-pointer',
              classes[state] ?? classes.default,
            )}
            onClick={onClick}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
