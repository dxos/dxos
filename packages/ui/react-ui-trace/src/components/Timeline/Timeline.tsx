//
// Copyright 2025 DXOS.org
//

import { format } from 'date-fns';
import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { LogLevel } from '@dxos/log';
import { Icon, type ThemedClassName, useDynamicRef, useForwardedRef, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Shimmer } from '@dxos/react-ui-components';
import { Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';
import { trim } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { type TimelineLayout, type TimelineRow, type TimelineSpan, layoutTimeline } from './timeline-layout.ts';
import { type TimelineOptions, compactOptions, defaultOptions } from './timeline-options.ts';

/**
 * Mercurial-style Commit.
 */
export type Commit = {
  id: string;
  timestamp?: Date; // TODO(burdon): Unix time?
  parents?: string[];
  branch: string;
  icon?: string;
  level?: LogLevel;
  message: string;
  tags?: string[];
  /** DXN link for navigation to referenced objects. */
  link?: string;
};

const SHIMMER_EFFECT_TAG = 'effect:shimmer';

/** Wall-clock to the second: a trace line is read against its neighbours, and milliseconds only widen the column. */
const TIMESTAMP_FORMAT = 'HH:mm:ss';

const hasShimmerEffect = (commit: Commit): boolean => commit.tags?.includes(SHIMMER_EFFECT_TAG) ?? false;

const empty = Object.freeze([]);

/** The part of the virtualizer the keyboard needs: it moves by row index, not by offset. */
type RowScroller = {
  scrollToIndex: (index: number, options?: { align?: 'auto' | 'start' | 'center' | 'end' }) => void;
};

export type TimelineProps = ThemedClassName<{
  /** Optional whitelist. */
  branches?: string[];
  /**
   * Controlled value for the highlighted branch.
   * When provided, takes precedence over the branch derived from the currently selected commit.
   */
  branch?: string | null;
  commits?: Commit[];
  showTimestamp?: boolean;
  showIcon?: boolean;
  compact?: boolean;
  options?: TimelineOptions;
  debug?: boolean;
  /** The scroller rows are windowed against; the host owns it, as every `Mosaic.VirtualStack` host does. */
  getScrollElement: () => HTMLElement | null;
  onChange?: (props: { current?: number; commit?: Commit }) => void;
  /**
   * Callback when a commit with a link is clicked.
   * If provided, commits with links will be navigable.
   */
  onSelect?: (commit: Commit | undefined) => void;
}>;

/**
 * GitGraph-style timeline.
 *
 * Rows are windowed by `Mosaic.VirtualStack`, so rendering costs the viewport rather than the
 * history. Requires an ambient `Dnd.Root` ancestor, which `Mosaic.Container` needs.
 */
export const Timeline = memo(
  composable<HTMLDivElement, TimelineProps>(
    (
      {
        branches: branchesProp,
        branch,
        commits = empty,
        showTimestamp = false,
        showIcon = true,
        compact = false,
        options = compact ? compactOptions : defaultOptions,
        debug = false,
        getScrollElement,
        onChange,
        onSelect,
        ...props
      },
      forwardedRef,
    ) => {
      const { t } = useTranslation(translationKey);
      const containerRef = useForwardedRef(forwardedRef);

      // Auto-discover branches if not provided.
      const branches = useMemo(() => {
        if (branchesProp) {
          return branchesProp;
        }

        return commits.reduce((branches, commit) => {
          if (!branches.includes(commit.branch)) {
            branches.push(commit.branch);
          }

          return branches;
        }, [] as string[]);
      }, [branchesProp, commits]);

      const layout = useMemo(() => layoutTimeline(commits, branches), [commits, branches]);

      // Navigation.
      const [current, setCurrent] = useState<number | undefined>(undefined);
      const currentRef = useDynamicRef<number | undefined>(current);
      const selectedRef = useDynamicRef<number | undefined>(undefined);
      const currentCommit = useMemo(() => (current !== undefined ? commits[current] : undefined), [current, commits]);

      // Controlled `branch` takes precedence over the branch derived from the selected commit.
      const highlightedBranch = branch ?? currentCommit?.branch;

      // Captured from the stack so the keyboard can reach a row that is not mounted.
      const rowScrollerRef = useRef<RowScroller | undefined>(undefined);
      const handleStackChange = useCallback((virtualizer: RowScroller) => {
        rowScrollerRef.current = virtualizer;
      }, []);

      useEffect(() => {
        onChange?.({ current, commit: current === undefined ? undefined : commits[current] });
        const row = current === undefined ? undefined : layout.rowByCommitIndex.get(current);
        if (row !== undefined) {
          // `auto` scrolls to the nearest edge, as the `block: 'nearest'` this replaces did.
          rowScrollerRef.current?.scrollToIndex(row, { align: 'auto' });
        }
      }, [onChange, current]);

      // When the controlled `branch` changes, jump to the first commit on that branch — but
      // never override an explicit commit selection that already sits on that branch. Otherwise a
      // click that selects a commit (and drives `branch` via the parent) would be snapped
      // back to the branch's first commit.
      useEffect(() => {
        if (!branch) {
          return;
        }
        if (currentRef.current !== undefined && commits[currentRef.current]?.branch === branch) {
          return;
        }

        const index = commits.findIndex((commit) => commit.branch === branch);
        if (index >= 0) {
          setCurrent(index);
        }
      }, [branch]);

      useEffect(() => {
        if (!containerRef.current) {
          return;
        }

        return addEventListener(containerRef.current, 'keydown', (event) => {
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
            case 'Enter': {
              event.preventDefault();
              if (currentRef.current !== undefined) {
                selectedRef.current = currentRef.current === selectedRef.current ? undefined : currentRef.current;
                onSelect?.(selectedRef.current !== undefined ? commits[selectedRef.current] : undefined);
              }
              break;
            }
          }
        });
      }, [commits, containerRef.current]);

      // Clicking the current commit clears the selection, as Enter does.
      const handleCurrentChange = useCallback(
        (id: string | undefined) => {
          const index = id === undefined ? undefined : layout.commitIndexById.get(id);
          if (index === undefined) {
            return;
          }
          if (selectedRef.current === index) {
            selectedRef.current = undefined;
            setCurrent(undefined);
            onSelect?.(undefined);
            return;
          }
          setCurrent(index);
          selectedRef.current = index;
          onSelect?.(commits[index]);
        },
        [layout, commits, onSelect],
      );

      // Positioned rows cannot share one subgrid, so every row carries the template the subgrid
      // used to provide. The columns still line up: a layout pass gives every row the same lane
      // width, and the icon and timestamp columns are fixed.
      const gridTemplateColumns = useMemo(
        () => ['min-content', showIcon && '1.25rem', '1fr', showTimestamp && 'max-content'].filter(Boolean).join(' '),
        [showIcon, showTimestamp],
      );

      const tileContext = useMemo<TimelineTileContextValue>(
        () => ({
          layout,
          options,
          showIcon,
          showTimestamp,
          debug,
          highlightedBranch,
          linkable: !!onSelect,
          gridTemplateColumns,
        }),
        [layout, options, showIcon, showTimestamp, debug, highlightedBranch, onSelect, gridTemplateColumns],
      );

      return (
        <Mosaic.Container asChild currentId={currentCommit?.id} onCurrentChange={handleCurrentChange}>
          <div {...composableProps(props, { classNames: 'outline-none' })} tabIndex={0} ref={containerRef}>
            {layout.rows.length < 1 ? (
              <p className='text-description p-trim-md'>{t('no-commits.message')}</p>
            ) : (
              <TimelineTileContext.Provider value={tileContext}>
                <Mosaic.VirtualStack<TimelineRow>
                  items={layout.rows}
                  getId={(row) => row.commit.id}
                  draggable={false}
                  // The stack's own scroll-into-view aligns a row to the top, which would move the
                  // view on every arrow press; `onChange` above drives the nearest-edge scroll.
                  scrollIntoView={false}
                  estimateSize={() => options.lineHeight}
                  getScrollElement={getScrollElement}
                  onChange={handleStackChange}
                  Tile={TimelineTile}
                />
              </TimelineTileContext.Provider>
            )}
          </div>
        </Mosaic.Container>
      );
    },
  ),
);

Timeline.displayName = 'Timeline';

//
// TimelineTile
//

type TimelineTileContextValue = {
  layout: TimelineLayout;
  options: TimelineOptions;
  showIcon: boolean;
  showTimestamp: boolean;
  debug: boolean;
  highlightedBranch: string | undefined;
  /** Whether a commit's link is navigable, i.e. the host passed `onSelect`. */
  linkable: boolean;
  gridTemplateColumns: string;
};

const TimelineTileContext = createContext<TimelineTileContextValue | null>(null);

const useTimelineTileContext = (): TimelineTileContextValue => {
  const context = useContext(TimelineTileContext);
  if (!context) {
    throw new Error('TimelineTile must be rendered within a Timeline.');
  }

  return context;
};

const TimelineTile = memo(({ id, data, location, current }: MosaicTileProps<TimelineRow>) => {
  const { layout, options, showIcon, showTimestamp, debug, highlightedBranch, linkable, gridTemplateColumns } =
    useTimelineTileContext();
  const { setCurrentId } = useMosaicContainer('TimelineTile');
  const { commit, index } = data;

  const handleClick = useCallback(() => setCurrentId(commit.id), [setCurrentId, commit.id]);

  const hasLink = !!commit.link && linkable;
  const message = debug ? JSON.stringify({ id: commit.id, parents: commit.parents }) : commit.message;

  return (
    <Mosaic.Tile
      asChild
      id={id}
      data={data}
      location={location}
      draggable={false}
      current={current}
      classNames='group/row grid gap-1 px-[2px] overflow-hidden items-center pe-2 dx-hover dx-current'
    >
      <div
        data-commit-index={index}
        style={{ gridTemplateColumns, height: `${options.lineHeight}px` }}
        onClick={handleClick}
      >
        <div className='px-2'>
          <LineVector
            layout={layout}
            index={index}
            commit={commit}
            highlightedBranch={highlightedBranch}
            options={options}
          />
        </div>
        {showIcon && <CommitIcon commit={commit} />}
        <div
          className={mx(
            'text-sm truncate cursor-pointer text-description font-thin group-aria-current/row:text-current-fg hover:text-current-fg',
            hasLink && 'underline decoration-dotted underline-offset-2',
          )}
        >
          {hasShimmerEffect(commit) ? <Shimmer>{message}</Shimmer> : message}
        </div>
        {showTimestamp && (
          <div className='text-xs tabular-nums items-center text-description font-thin'>
            {commit.timestamp && format(commit.timestamp, TIMESTAMP_FORMAT)}
          </div>
        )}
      </div>
    </Mosaic.Tile>
  );
});

TimelineTile.displayName = 'TimelineTile';

const CommitIcon = memo(({ commit }: { commit: Commit }) => {
  if (!commit.icon) {
    return <div />;
  }

  return (
    <Icon
      icon={commit.icon}
      size={4}
      synchronized
      classNames={mx(
        commit.icon === 'ph--spinner-gap--regular' && 'animate-spin',
        commit.level !== undefined && levelColors[commit.level],
      )}
    />
  );
});

type Color = {
  stroke: string;
  fill: string;
};

const colors: Color[] = [
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

type LineVectorProps = {
  layout: TimelineLayout;
  index: number;
  commit: Commit;
  highlightedBranch: string | undefined;
  options: TimelineOptions;
};

/**
 * SVG for node and connector paths.
 */
const LineVector = memo(({ layout, index, commit, highlightedBranch, options }: LineVectorProps) => {
  const { branchLane, laneCount, spans } = layout;
  const halfHeight = options.lineHeight / 2;
  const cx = (column: number) => column * options.columnWidth + options.columnWidth / 2;
  const getBranchIndex = (branch: string): number => branchLane.get(branch) ?? -1;

  // Create connector path.
  const createPath = (index: number, commit: Commit, branch: string, span: TimelineSpan): string | undefined => {
    const parents = commit.parents ?? [];
    const commitIndex = getBranchIndex(commit.branch);
    const branchIndex = getBranchIndex(branch);

    // Vertical connectors.
    if (span.start < index && index < span.end) {
      return `M ${cx(branchIndex)} 0 l 0 ${options.lineHeight}`;
    } else if (commit.branch === branch && parents.length > 0) {
      return `M ${cx(branchIndex)} 0 l 0 ${halfHeight}`;
    } else if (commit.branch === branch && index < span.end) {
      return `M ${cx(branchIndex)} ${halfHeight} l 0 ${options.lineHeight}`;
    }

    // Branch.
    // TODO(burdon): Assumes can only branch to the right.
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

  const col = getBranchIndex(commit.branch);
  const color = colors[col % colors.length];
  const opacity = (branch: string | undefined) => [
    'duration-500 transition-opacity',
    highlightedBranch === undefined || branch === highlightedBranch ? 'opacity-100' : 'opacity-50',
  ];

  return (
    <svg width={laneCount * options.columnWidth} height={options.lineHeight}>
      {/* Connectors */}
      {[...spans.entries()].map(([branch, span]) => {
        const lane = getBranchIndex(branch);
        if (lane < 0) {
          return null;
        }

        const color = colors[lane % colors.length];
        const path = createPath(index, commit, branch, span);
        if (!path) {
          return null;
        }

        return (
          <path
            key={branch}
            d={path}
            fill='none'
            className={mx(options.lineStyle, color.stroke, color.fill, opacity(branch))}
          />
        );
      })}

      <circle
        cx={cx(col)}
        cy={halfHeight}
        r={options.nodeRadius}
        className={mx('fill-base-surface stroke-base-surface')}
      />
      <circle
        cx={cx(col)}
        cy={halfHeight}
        r={options.nodeRadius}
        className={mx('fill-base-surface', options.lineStyle, color?.stroke, color?.fill, opacity(commit.branch))}
      />
    </svg>
  );
});
