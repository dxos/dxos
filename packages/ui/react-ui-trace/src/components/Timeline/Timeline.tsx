//
// Copyright 2025 DXOS.org
//

import { format } from 'date-fns';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { LogLevel } from '@dxos/log';
import { Icon, type ThemedClassName, useDynamicRef, useForwardedRef, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Shimmer } from '@dxos/react-ui-components';
import { type WindowController, useListModel, useWindow } from '@dxos/react-ui-virtual';
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
  /**
   * The element the rows are windowed against, which the host owns: a `ScrollArea.Viewport` or a
   * `ScrollContainer.Viewport`, as `MessageList` binds to. Rows mount once it exists.
   */
  scroller: HTMLElement | null;
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
 * Rows are windowed by `useWindow`, so rendering costs the viewport rather than the history. The
 * layout is still computed over the whole history, so a windowed row draws every lane crossing it.
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
        scroller,
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

      const currentRow = current === undefined ? undefined : layout.rowByCommitIndex.get(current);

      useEffect(() => {
        onChange?.({ current, commit: current === undefined ? undefined : commits[current] });
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
      const handleRowClick = useCallback(
        (index: number) => {
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
        [commits, onSelect],
      );

      // Positioned rows cannot share one subgrid, so every row carries the template the subgrid
      // used to provide. The columns still line up: a layout pass gives every row the same lane
      // width, and the icon and timestamp columns are fixed.
      const gridTemplateColumns = useMemo(
        () => ['min-content', showIcon && '1.25rem', '1fr', showTimestamp && 'max-content'].filter(Boolean).join(' '),
        [showIcon, showTimestamp],
      );

      return (
        <div
          {...composableProps(props, { classNames: 'relative outline-none' })}
          role='list'
          tabIndex={0}
          ref={containerRef}
        >
          {layout.rows.length < 1 ? (
            <p className='text-description p-trim-md'>{t('no-commits.message')}</p>
          ) : (
            scroller && (
              <TimelineWindow
                scroller={scroller}
                layout={layout}
                options={options}
                currentRow={currentRow}
                showIcon={showIcon}
                showTimestamp={showTimestamp}
                debug={debug}
                highlightedBranch={highlightedBranch}
                linkable={!!onSelect}
                gridTemplateColumns={gridTemplateColumns}
                onRowClick={handleRowClick}
              />
            )
          )}
        </div>
      );
    },
  ),
);

Timeline.displayName = 'Timeline';

//
// TimelineWindow
//

type TimelineRowContext = {
  layout: TimelineLayout;
  options: TimelineOptions;
  showIcon: boolean;
  showTimestamp: boolean;
  debug: boolean;
  highlightedBranch: string | undefined;
  /** Whether a commit's link is navigable, i.e. the host passed `onSelect`. */
  linkable: boolean;
  gridTemplateColumns: string;
  onRowClick: (commitIndex: number) => void;
};

type TimelineWindowProps = TimelineRowContext & {
  scroller: HTMLElement;
  currentRow: number | undefined;
};

const getRowId = (row: TimelineRow) => row.commit.id;

/**
 * The mounted rows: a sizer that gives the scrollbar the whole history's extent, and a window
 * holding the rows in view, translated to where they belong. Rendered only once the host's
 * scroller exists, because the placement binds to the element on mount.
 */
const TimelineWindow = ({ scroller, layout, options, currentRow, ...context }: TimelineWindowProps) => {
  const scrollerRef = useRef<HTMLElement | null>(scroller);
  scrollerRef.current = scroller;

  const model = useListModel(layout.rows, getRowId);
  // Exact: every row is `lineHeight` tall, so offsets are a prefix sum and nothing is ever corrected.
  const extents = useMemo(() => ({ of: () => options.lineHeight, exact: true }), [options.lineHeight]);
  const controllerRef = useRef<WindowController>(null);
  const {
    layout: { visible },
    windowRef,
    offset,
    sizerExtent,
    first,
    last,
  } = useWindow({ scrollerRef, model, extents, controllerRef });

  // Nearest edge, as the `scrollIntoView({ block: 'nearest' })` this replaces did: a row already in
  // view is left alone, so an arrow press moves the view only when the current row would leave it.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  useEffect(() => {
    if (currentRow === undefined) {
      return;
    }

    const { first, last } = visibleRef.current;
    if (currentRow < first) {
      controllerRef.current?.scrollToIndex(currentRow, 'start');
    } else if (currentRow > last) {
      controllerRef.current?.scrollToIndex(currentRow, 'end');
    }
  }, [currentRow]);

  const rows = [];
  for (let index = first; index <= last; index++) {
    // From the layout rather than the model: the model folds a new layout in one effect later, and
    // a row read from it in between would be drawn against spans it was not laid out with.
    const row = layout.rows[index];
    if (!row) {
      continue;
    }

    rows.push(
      <TimelineRowView
        key={row.commit.id}
        index={index}
        row={row}
        current={index === currentRow}
        layout={layout}
        options={options}
        {...context}
      />,
    );
  }

  return (
    <>
      <div style={{ height: sizerExtent }} />
      <div
        ref={windowRef}
        className='absolute top-0 left-0 flex flex-col w-full'
        style={{ transform: `translateY(${offset}px)` }}
      >
        {rows}
      </div>
    </>
  );
};

//
// TimelineRow
//

type TimelineRowViewProps = TimelineRowContext & {
  /** Row index in the window, which the placement measures rows by. */
  index: number;
  row: TimelineRow;
  current: boolean;
};

const TimelineRowView = memo(
  ({
    index,
    row,
    current,
    layout,
    options,
    showIcon,
    showTimestamp,
    debug,
    highlightedBranch,
    linkable,
    gridTemplateColumns,
    onRowClick,
  }: TimelineRowViewProps) => {
    const { commit } = row;
    const handleClick = useCallback(() => onRowClick(row.index), [onRowClick, row.index]);

    const hasLink = !!commit.link && linkable;
    const message = debug ? JSON.stringify({ id: commit.id, parents: commit.parents }) : commit.message;

    return (
      <div
        role='listitem'
        data-index={index}
        data-object-id={commit.id}
        data-commit-index={row.index}
        aria-current={current ? 'true' : undefined}
        className='group/row grid gap-1 px-[2px] overflow-hidden items-center pe-2 dx-hover dx-current'
        style={{ gridTemplateColumns, height: `${options.lineHeight}px` }}
        onClick={handleClick}
      >
        <div className='px-2'>
          <LineVector
            layout={layout}
            index={row.index}
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
    );
  },
);

TimelineRowView.displayName = 'TimelineRowView';

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
    highlightedBranch === undefined || branch === highlightedBranch ? 'opacity-100' : 'opacity-40',
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
