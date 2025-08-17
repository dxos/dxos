//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { LogLevel } from '@dxos/log';
import { Icon, type ThemedClassName, useDynamicRef, useForwardedRef } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { trim } from '@dxos/util';

// TODO(burdon): Move to react-ui-components?

const lineHeight = 24;
const columnWidth = 14;
const nodeRadius = 4;
const lineStyle = 'stroke-1';

/**
 * Mercurial-style Commit.
 */
export type Commit = {
  id: string;
  parents?: string[];
  branch: string;
  icon?: string;
  level?: LogLevel;
  message: string;
  timestamp?: Date;
  tags?: string[];
};

export type TimelineProps = ThemedClassName<{
  /** Optional whitelist. */
  branches?: string[];
  commits?: Commit[];
  showIcon?: boolean;
  debug?: boolean;
  onCurrentChange?: (props: { current?: number; commit?: Commit }) => void;
}>;

const empty = Object.freeze([]);

/**
 * GitGraph-style timeline.
 */
export const Timeline = forwardRef<ScrollController, TimelineProps>(
  (
    { classNames, branches: _branches, commits = empty, showIcon = true, debug = false, onCurrentChange },
    forwardedRef,
  ) => {
    const scrollerRef = useForwardedRef(forwardedRef);

    // Auto-discover branches if not provided.
    const branches = useMemo(() => {
      if (_branches) {
        return _branches;
      }

      return commits.reduce((branches, commit) => {
        if (!branches.includes(commit.branch)) {
          branches.push(commit.branch);
        }

        return branches;
      }, [] as string[]);
    }, [_branches, commits]);

    // NOTE: Assumes commits are in topological order.
    const getCommitIndex = (id: string) => commits.findIndex((c) => c.id === id);
    const getBranchIndex = (branch: string): number => branches.findIndex((b) => b === branch);
    const getBranch = (id: string) => commits.find((c) => c.id === id)?.branch;

    /**
     * Create spans for each branch.
     */
    const spans = useMemo(() => {
      const spans = new Map<string, Span>();
      commits.forEach((commit, index) => {
        let span = spans.get(commit.branch);
        if (!span) {
          span = { start: index, end: index };
          spans.set(commit.branch, span);
        } else {
          span.end = index;
        }

        const parents = commit.parents ?? [];
        for (const parent of parents) {
          const branch = getBranch(parent);
          if (branch && branch !== commit.branch) {
            span.start = Math.min(span.start, getCommitIndex(parent));

            // Detect merge.
            if (parents.length > 1) {
              const parentSpan = spans.get(branch);
              if (parentSpan) {
                parentSpan.end = Math.max(parentSpan.end, index);
              }
            }
          }
        }
      });

      return spans;
    }, [commits, branches]);

    // Navigation.
    const containerRef = useRef<HTMLDivElement>(null);
    const [current, setCurrent] = useState<number | undefined>();
    const currentRef = useDynamicRef(current);
    const currentCommit = useMemo(() => (current !== undefined ? commits[current] : undefined), [current, commits]);
    useEffect(() => {
      onCurrentChange?.({ current, commit: current === undefined ? undefined : commits[current] });
      const el = containerRef.current?.querySelector(`[data-index="${current}"]`);
      el?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }, [current]);
    useEffect(() => {
      return addEventListener(containerRef.current!, 'keydown', (event) => {
        switch (event.key) {
          case 'ArrowUp': {
            event.preventDefault(); // Prevent implicit scrolling.
            if (event.metaKey || currentRef.current === undefined) {
              setCurrent(0);
            } else {
              setCurrent((selected) => {
                if (event.shiftKey && selected !== undefined) {
                  const branch = commits[selected].branch;
                  for (let i = selected - 1; i >= 0; i--) {
                    if (commits[i].branch === branch) {
                      return i;
                    }
                  }
                  return selected;
                } else {
                  return selected === undefined ? commits.length - 1 : Math.max(0, selected - 1);
                }
              });
            }
            break;
          }
          case 'ArrowDown': {
            event.preventDefault(); // Prevent implicit scrolling.
            if (event.metaKey || currentRef.current === undefined) {
              setCurrent(commits.length - 1);
            } else {
              setCurrent((selected) => {
                if (event.shiftKey && selected !== undefined) {
                  const branch = commits[selected].branch;
                  for (let i = selected + 1; i <= commits.length - 1; i++) {
                    if (commits[i].branch === branch) {
                      return i;
                    }
                  }
                  return selected;
                } else {
                  return selected === undefined ? 0 : Math.min(commits.length - 1, selected + 1);
                }
              });
            }
            break;
          }
          case 'Escape': {
            setCurrent(undefined);
            break;
          }
        }
      });
    }, [commits, containerRef.current]);

    return (
      <ScrollContainer ref={scrollerRef}>
        <div tabIndex={0} className={mx('flex flex-col is-full !outline-none', classNames)} ref={containerRef}>
          {commits.map((commit, index) => {
            // Skip branches that are not whitelisted.
            const idx = getBranchIndex(commit.branch);
            if (idx === -1) {
              return null;
            }

            return (
              <div
                key={commit.id}
                data-index={index}
                aria-current={current === index}
                className={mx(
                  'group flex shrink-0 overflow-hidden pis-3 pie-3 gap-2 items-center',
                  // TODO(burdon): Factor out fragment.
                  'aria-[current=true]:bg-activeSurface hover:bg-hoverSurface',
                )}
                style={{ height: `${lineHeight}px` }}
                onClick={() => setCurrent(index)}
              >
                <div className='flex shrink-0'>
                  <LineVector
                    branches={branches}
                    spans={spans}
                    index={index}
                    commit={commit}
                    currentCommit={currentCommit}
                  />
                </div>
                {showIcon && (
                  <div className='flex shrink-0 w-6 justify-center'>
                    {commit.icon && (
                      <Icon icon={commit.icon} classNames={mx(commit.level && levelColors[commit.level])} size={4} />
                    )}
                  </div>
                )}
                <div className='text-sm truncate cursor-pointer text-subdued group-hover:text-baseText'>
                  {debug ? JSON.stringify({ id: commit.id, parents: commit.parents }) : commit.message}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollContainer>
    );
  },
);

type Span = {
  start: number;
  end: number;
};

const cx = (c: number) => c * columnWidth + columnWidth / 2;

const colors = [
  { stroke: 'stroke-orange-500', fill: 'group-aria-[current=true]:fill-orange-500' },
  { stroke: 'stroke-sky-500', fill: 'group-aria-[current=true]:fill-sky-500' },
  { stroke: 'stroke-green-500', fill: 'group-aria-[current=true]:fill-green-500' },
  { stroke: 'stroke-fuchsia-500', fill: 'group-aria-[current=true]:fill-fuchsia-500' },
  { stroke: 'stroke-cyan-500', fill: 'group-aria-[current=true]:fill-cyan-500' },
  { stroke: 'stroke-emerald-500', fill: 'group-aria-[current=true]:fill-emerald-500' },
  { stroke: 'stroke-violet-500', fill: 'group-aria-[current=true]:fill-violet-500' },
  { stroke: 'stroke-teal-500', fill: 'group-aria-[current=true]:fill-teal-500' },
];

const levelColors: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'text-gray-500',
  [LogLevel.DEBUG]: 'text-gray-500',
  [LogLevel.VERBOSE]: 'text-gray-500',
  [LogLevel.INFO]: 'text-green-500',
  [LogLevel.WARN]: 'text-orange-500',
  [LogLevel.ERROR]: 'text-red-500',
};

/**
 * SVG for node and connector paths.
 */
const LineVector = ({
  branches,
  spans,
  index,
  commit,
  currentCommit,
}: {
  branches: readonly string[];
  spans: Map<string, Span>;
  index: number;
  commit: Commit;
  currentCommit: Commit | undefined;
}) => {
  const halfHeight = lineHeight / 2;
  const getBranchIndex = (branch: string): number => branches.findIndex((b) => b === branch);

  // Create connector path.
  const createPath = (index: number, commit: Commit, branch: string, span: Span): string | undefined => {
    const parents = commit.parents ?? [];
    const commitIndex = getBranchIndex(commit.branch);
    const branchIndex = getBranchIndex(branch);

    // Vertical connectors.
    if (span.start < index && index < span.end) {
      return `M ${cx(branchIndex)} 0 l 0 ${lineHeight}`;
    } else if (commit.branch === branch && parents.length > 0) {
      return `M ${cx(branchIndex)} 0 l 0 ${halfHeight}`;
    } else if (commit.branch === branch && index < span.end) {
      return `M ${cx(branchIndex)} ${halfHeight} l 0 ${lineHeight}`;
    }

    // TODO(burdon): Assumes can only branch to the right.

    // Branch.
    if (commit.branch !== branch && index === span.start) {
      return trim`
        M ${cx(commitIndex)} ${halfHeight}
        L ${cx(branchIndex) - halfHeight} ${halfHeight}
        a ${halfHeight} ${halfHeight} 0 0 1 ${halfHeight} ${halfHeight}
      `;
    }

    // Merge.
    if (commit.branch !== branch && index === span.end) {
      return trim`
        M ${cx(commitIndex)} ${halfHeight}
        L ${cx(branchIndex) - halfHeight} ${halfHeight}
        a ${halfHeight} ${halfHeight} -90 0 0 ${halfHeight} ${-halfHeight}
      `;
    }
  };

  const col = branches.findIndex((branch) => branch === commit.branch);
  const color = colors[col % colors.length];
  const opacity = (branch: string | undefined) => (branch === currentCommit?.branch ? 'opacity-100' : 'opacity-80');

  return (
    <svg width={branches.length * columnWidth} height={lineHeight}>
      {/* Connectors */}
      {branches.map((branch, col) => {
        const color = colors[col % colors.length];
        const span = spans.get(branch);
        const path = span && createPath(index, commit, branch, span);
        if (!path) {
          return null;
        }

        return <path key={col} d={path} fill='none' className={mx(lineStyle, color.stroke, opacity(branch))} />;
      })}

      {/* Node */}
      <circle cx={cx(col)} cy={halfHeight} r={nodeRadius} />
      <circle
        cx={cx(col)}
        cy={halfHeight}
        r={nodeRadius}
        className={mx(lineStyle, color.stroke, color.fill, opacity(commit.branch))}
      />
    </svg>
  );
};
