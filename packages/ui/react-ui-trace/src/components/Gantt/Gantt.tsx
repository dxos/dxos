//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, {
  Fragment,
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createContext, useComposedRefs } from '@dxos/react-hooks';
import {
  Button,
  HoverCard,
  ScrollArea,
  type ThemedClassName,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';
import { type Hue, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations.ts';
import { type Band, type Row, orderRows } from './gantt-rows.ts';
import { type GanttAxis, type GanttScale, formatElapsed, timeScale, unitScale } from './gantt-scale.ts';
import { useEnter } from './useEnter.ts';
import { useRangeTween } from './useRangeTween.ts';

/**
 * The chart's vocabulary is groups, lanes, segments and markers — deliberately not the vocabulary of
 * whatever is being charted. A host maps its own nouns onto these (a process onto a group, a task
 * onto a lane, a status change onto a marker) and the chart stays ignorant of what they mean.
 */
export type GanttLaneStatus = 'pending' | 'blocked' | 'running' | 'review' | 'done' | 'failed';

/**
 * A band of related lanes, enclosed by one rectangle. Pure structure: the lanes inside carry the
 * labels, so a group needs no name of its own.
 */
export type GanttGroup = {
  id: string;
  /** Indents under another group; a nested group's band is drawn after its parent's. */
  parentId?: string;
};

/** One stretch during which a lane was worked. `end` is absent while the stretch is still open. */
export type GanttSegment = {
  start: number;
  end?: number;
};

/** A fact the host wants beside a lane: the legend shows it in place of, or over, the lane's title, and never interprets it. */
export type GanttMeta = {
  label: string;
  title?: string;
};

/**
 * One row. Its three references are deliberately distinct: `groupId` is which band it sits in,
 * `parentId` is what it nests under, and `openedFrom` is what caused it. Collapsing any two of them
 * into one edge is what left the previous model unable to hold a task hierarchy and a process tree
 * at the same time.
 */
export type GanttLane = {
  id: string;
  label: string;
  status: GanttLaneStatus;
  /** The band this lane sits in. */
  groupId?: string;
  /** Indents under another lane of the same group — nesting, nothing more. */
  parentId?: string;
  /** Every stretch this lane was worked. A lane with none exists but has no extent, so no bar. */
  segments?: readonly GanttSegment[];
  /** The node this lane opened out of, on another lane. */
  openedFrom?: { laneId: string; markerId: string };
  /**
   * The node this lane's result came back into, on another lane — the mirror of `openedFrom`, and a
   * separate fact: a lane can open out of another and end without ever reporting back.
   */
  closedInto?: { laneId: string; markerId: string };
  /** Colours the legend dot, the bar, its nodes and its thread in place of the status colour. */
  hue?: Hue;
  /** Lanes this one waits on. */
  blockedOn?: readonly string[];
  meta?: readonly GanttMeta[];
};

export type GanttMarker = {
  id: string;
  laneId: string;
  /** The host's own word for what happened; shown in the hover card, never interpreted. */
  kind?: string;
  timestamp: number;
  label: string;
  level?: 'info' | 'warn' | 'error';
  /**
   * A wait begun at this node and since ended — a question put to the reader and answered. Drawn as a
   * dashed line along the lane to the node that ended it; a wait still open draws nothing, so the lane
   * ends at the question until the answer lands.
   */
  wait?: { until: string };
  /** Awaiting a response — an unanswered question. The node pings until the response arrives. */
  pending?: boolean;
};

const PAD_X = 16;
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 20;

/** Pixels per event on the `unit` axis — wide enough that two adjacent nodes read as two. */
const UNIT_STEP = 32;
/** How long a newly arrived element takes to travel from where it came from to where it belongs. */
const ENTER_TRANSITION = 'duration-500 ease-out';

/** Within this of the live edge the chart keeps following it; past it the reader is reading history. */
const FOLLOW_SLACK = 4;
/**
 * How long the chart takes to drift to the live edge. Longer than the enter transition on purpose:
 * the arriving event settles into place first, and the window follows it rather than racing it.
 */
const FOLLOW_DURATION = 600;

const NODE_RADIUS = 6;
const BAR_HEIGHT = 15;
/** The thread through a lane's nodes: a hairline, so the nodes remain what the row reads as. */
const THREAD_HEIGHT = 1;
/**
 * A bar reaches half its height past its first and last instant, so a node sitting on either one is
 * as far from the bar's end as it is from its top and bottom.
 */
const BAR_OVERHANG = BAR_HEIGHT / 2;

/** Gap between adjacent band rectangles, halved on each. */
const GROUP_INSET = 2;
/** The rectangle's clearance around its bars, the same on every side, so its corners stay concentric with theirs. */
const GROUP_PAD = ROW_HEIGHT / 2 - BAR_HEIGHT / 2 - GROUP_INSET;
const GROUP_RADIUS = BAR_HEIGHT / 2 + GROUP_PAD;

/** Radius of the connector's bend from the drop into the lane it opens. */
const BEND_RADIUS = BAR_HEIGHT / 2;

/**
 * Bar, node, thread and label colours per status: nodes and the thread through them are the bar's
 * hue in a lighter shade, and `edge` — the live end of a lane still running — is the stronger shade
 * the legend's own status dot uses, so the two read as the same statement about the lane.
 */
/**
 * A hued lane's colour: the theme's tag surface token, read as a variable because the hue is data, so
 * the lane matches a `Tag` of the same hue.
 */
const hueColor = (hue: Hue): string => `var(--color-${hue}-surface)`;

/** The hue's strong shade, for a node that needs attention (a question, an error) within its lane. */
const hueStrongColor = (hue: Hue): string => `var(--color-${hue}-text)`;

const STATUS_COLOR: Record<
  GanttLaneStatus,
  { fill: string; node: string; edge: string; thread: string; text: string }
> = {
  pending: {
    fill: 'fill-neutral-500/40',
    node: 'fill-neutral-300',
    edge: 'fill-neutral-400',
    thread: 'stroke-neutral-300',
    text: 'text-neutral-400',
  },
  blocked: {
    fill: 'fill-orange-500/40',
    node: 'fill-orange-300',
    edge: 'fill-orange-500',
    thread: 'stroke-orange-300',
    text: 'text-orange-500',
  },
  running: {
    fill: 'fill-sky-500/40',
    node: 'fill-sky-300',
    edge: 'fill-sky-500',
    thread: 'stroke-sky-300',
    text: 'text-sky-500',
  },
  review: {
    fill: 'fill-cyan-500/40',
    node: 'fill-cyan-300',
    edge: 'fill-cyan-500',
    thread: 'stroke-cyan-300',
    text: 'text-cyan-500',
  },
  done: {
    fill: 'fill-green-500/40',
    node: 'fill-green-300',
    edge: 'fill-green-500',
    thread: 'stroke-green-300',
    text: 'text-green-500',
  },
  failed: {
    fill: 'fill-red-500/40',
    node: 'fill-red-300',
    edge: 'fill-red-500',
    thread: 'stroke-red-300',
    text: 'text-red-500',
  },
};

/** A node that asks for attention: a question put to the reader, or something that went wrong. */
const isAlert = (marker: GanttMarker): boolean => marker.level === 'warn' || marker.level === 'error';

const CONNECTOR_CLASSNAME = 'stroke-fuchsia-500';

/** What the legend's column shows per lane: its title, or the facts the host attached to it. */
export type GanttLegendMode = 'title' | 'stats';

export type GanttData = {
  /** The bands. A chart with none draws its lanes plain, with no rectangles. */
  groups?: readonly GanttGroup[];
  lanes: readonly GanttLane[];
  markers?: readonly GanttMarker[];
  range?: { start: number; end: number };
  now?: number;
  showNow?: boolean;
  /**
   * What the horizontal axis measures: `unit` steps once per event and scrolls to follow the newest;
   * `time` fits the whole range to the width and eases to new bounds. `unit` by default.
   */
  axis?: GanttAxis;
  /** Pixels per event on the `unit` axis. */
  unitStep?: number;
  /**
   * Slide a newly arrived event out of the one before it — out of the node that opened its lane, for
   * a lane's first — and grow its bar to meet it, on the `unit` axis. Only events that arrive while the
   * chart is on screen animate, so a chart that is merely mounted is still.
   */
  animate?: boolean;
  onLaneSelect?: (lane: GanttLane) => void;
  onMarkerSelect?: (marker: GanttMarker) => void;
  /** Called by `Gantt.AxisToggle`; without it the toggle does not render. */
  onAxisChange?: (axis: GanttAxis) => void;
  /** What the legend's column shows; held by the root when absent, `title` to begin with. */
  legend?: GanttLegendMode;
  /** Called by `Gantt.LegendToggle`. */
  onLegendChange?: (legend: GanttLegendMode) => void;
};

/** What every part reads: the ordered rows and the shared axis, resolved once by the root. */
type GanttContextValue = {
  rows: Row[];
  bands: Band[];
  rowById: Map<string, Row>;
  markers: readonly GanttMarker[];
  markerById: Map<string, GanttMarker>;
  range: { start: number; end: number };
  legend: GanttLegendMode;
  setLegend: (legend: GanttLegendMode) => void;
  /** The one scrolling element: lanes scroll vertically under the axis, the drawing horizontally beside the legend. */
  viewport: HTMLDivElement | null;
  /** Reports the sticky legend's width, which the horizontal bar keeps clear of since the legend does not scroll. */
  setLegendWidth: (width: number) => void;
} & Pick<
  GanttData,
  'onLaneSelect' | 'onMarkerSelect' | 'onAxisChange' | 'now' | 'showNow' | 'axis' | 'unitStep' | 'animate'
>;

const [GanttProvider, useGanttContext] = createContext<GanttContextValue>('Gantt');

//
// Root
//

type GanttRootProps = ThemedClassName<GanttData & { children?: ReactNode }>;

/**
 * Gantt view of lanes on a shared axis. The root resolves the rows and the axis and fills its host;
 * the parts lay out side by side in the order given, sharing one row grid: `Legend` names the lanes
 * and `Chart` draws them. A host that already lists the lanes renders the chart alone.
 *
 * The root owns the scrolling, on both axes at once: the legend's rows and the chart's move together
 * vertically, the legend stays put while the drawing scrolls horizontally, and the horizontal bar is
 * at the foot of the host rather than under the last lane.
 */
const GanttRoot = composable<HTMLDivElement, GanttRootProps>(
  (
    {
      groups = [],
      lanes,
      markers = [],
      range: rangeProp,
      now,
      showNow,
      axis = 'unit',
      unitStep,
      animate,
      onLaneSelect,
      onMarkerSelect,
      onAxisChange,
      legend: legendProp,
      onLegendChange,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const [legendState, setLegendState] = useState<GanttLegendMode>('title');
    const legend = legendProp ?? legendState;
    const setLegend = useCallback(
      (next: GanttLegendMode) => {
        setLegendState(next);
        onLegendChange?.(next);
      },
      [onLegendChange],
    );
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
    const [legendWidth, setLegendWidth] = useState(0);
    const { rows, bands } = useMemo(() => orderRows(groups, lanes), [groups, lanes]);
    const rowById = useMemo(() => new Map(rows.map((row) => [row.lane.id, row])), [rows]);
    const markerById = useMemo(() => new Map(markers.map((marker) => [marker.id, marker])), [markers]);
    const range = useMemo(() => {
      if (rangeProp) {
        return rangeProp;
      }
      const times = [
        ...lanes.flatMap((lane) => (lane.segments ?? []).flatMap((segment) => [segment.start, segment.end])),
        ...markers.map((marker) => marker.timestamp),
      ]
        .filter((time): time is number => time !== undefined)
        .concat(now === undefined ? [] : [now]);
      const start = times.length > 0 ? Math.min(...times) : 0;
      return { start, end: times.length > 0 ? Math.max(...times) : start };
    }, [rangeProp, lanes, markers, now]);

    return (
      <GanttProvider
        rows={rows}
        bands={bands}
        rowById={rowById}
        markers={markers}
        markerById={markerById}
        range={range}
        now={now}
        showNow={showNow}
        axis={axis}
        unitStep={unitStep}
        animate={animate}
        onLaneSelect={onLaneSelect}
        onMarkerSelect={onMarkerSelect}
        onAxisChange={onAxisChange}
        legend={legend}
        setLegend={setLegend}
        viewport={viewport}
        setLegendWidth={setLegendWidth}
      >
        <ScrollArea.Root
          {...composableProps(props, { classNames: 'dx-expand text-xs font-mono' })}
          orientation='all'
          trackStart={legendWidth}
          ref={forwardedRef}
        >
          {/* `items-start`: the parts are drawn in pixel rows, so a stretching host must not spread them. */}
          <ScrollArea.Viewport classNames='flex items-start' ref={setViewport}>
            {children}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </GanttProvider>
    );
  },
);

GanttRoot.displayName = 'Gantt.Root';

//
// Legend
//

type GanttLegendProps = ThemedClassName<PropsWithChildren>;

/**
 * The lane names, one per row, indented by depth; each row is the lane's keyboard path. Children go
 * in the header row above the names, beside the chart's axis labels (e.g. `Gantt.AxisToggle`).
 *
 * The column shows each lane's title or its stats (`legend` on the root), and whichever it is not
 * showing is in a hover card over the row, so neither costs a column of its own.
 */
const GanttLegend = composable<HTMLDivElement, GanttLegendProps>(({ children, ...props }, forwardedRef) => {
  const { rows, legend, onLaneSelect, setLegendWidth } = useGanttContext('Gantt.Legend');
  const legendRef = useRef<HTMLDivElement>(null);
  const ref = useComposedRefs(forwardedRef, legendRef);
  useEffect(() => {
    const element = legendRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() => setLegendWidth(element.offsetWidth));
    observer.observe(element);
    return () => {
      observer.disconnect();
      setLegendWidth(0);
    };
  }, [setLegendWidth]);

  return (
    <div
      {...composableProps(props, {
        // Sticky and opaque: the drawing scrolls horizontally beneath it. Sized against the scroll
        // frame (`cqw`) rather than its parent, whose width is the drawing's.
        classNames:
          'sticky left-0 z-[1] shrink-0 w-[min(15rem,20cqw)] min-w-40 flex flex-col font-sans bg-(--surface-bg)',
      })}
      ref={ref}
    >
      <div className='flex items-center' style={{ height: HEADER_HEIGHT }}>
        {children}
      </div>
      {rows.map(({ lane, depth }) => (
        <div
          key={lane.id}
          className={mx(
            'flex items-center gap-2 min-w-0',
            onLaneSelect && 'cursor-pointer hover:bg-hover-surface-subtle',
          )}
          style={{ height: ROW_HEIGHT, paddingInlineStart: `${0.5 + depth}rem` }}
          data-testid='gantt.legend.row'
          // Button semantics only when there is something to select: the label row is the lane's
          // keyboard path, and an inert focus stop would be noise.
          {...(onLaneSelect && {
            role: 'button',
            tabIndex: 0,
            onClick: () => onLaneSelect(lane),
            onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onLaneSelect(lane);
              }
            },
          })}
        >
          <span
            className={mx('shrink-0 w-2 h-2 rounded-full bg-current', !lane.hue && STATUS_COLOR[lane.status].text)}
            style={lane.hue ? { color: hueColor(lane.hue) } : undefined}
          />
          <GanttLaneLabel lane={lane} legend={legend} />
        </div>
      ))}
    </div>
  );
});

GanttLegend.displayName = 'Gantt.Legend';

/** A legend row's text, and a hover card holding what the column is not showing. */
const GanttLaneLabel = ({ lane, legend }: { lane: GanttLane; legend: GanttLegendMode }) => {
  const meta = lane.meta ?? [];
  const title = (
    <span className='truncate text-fg' data-testid='gantt.legend.title'>
      {lane.label}
    </span>
  );
  // Grows across the row so a lane with no stats still has something to hover for its title.
  const stats = (
    <span
      className='grow flex gap-2 truncate text-fg-muted whitespace-nowrap tabular-nums'
      data-testid='gantt.legend.stats'
    >
      {meta.map(({ label }, index) => (
        <span key={index}>{label}</span>
      ))}
    </span>
  );
  if (legend === 'title' && meta.length === 0) {
    return title;
  }

  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>{legend === 'title' ? title : stats}</HoverCard.Trigger>
      <HoverCard.Content classNames='p-2 max-w-72 text-xs' data-testid='gantt.legend.card'>
        {legend === 'title' ? (
          meta.map(({ label, title }, index) => (
            <div key={index} className='tabular-nums'>
              {label}
              {title && <span className='text-fg-muted'>{` · ${title}`}</span>}
            </div>
          ))
        ) : (
          <div className='font-medium'>{lane.label}</div>
        )}
      </HoverCard.Content>
    </HoverCard.Root>
  );
};

//
// AxisToggle
//

type GanttAxisToggleProps = {};

/**
 * Switches the chart between its axes: `time`, the run fitted to the width, and `unit`, one step per
 * event. Renders nothing unless the root was given `onAxisChange`, since the axis is the host's state.
 */
const GanttAxisToggle = (_: GanttAxisToggleProps) => {
  const { t } = useTranslation(translationKey);
  const { axis = 'unit', onAxisChange } = useGanttContext('Gantt.AxisToggle');
  if (!onAxisChange) {
    return null;
  }

  // The icon names the axis in use; the label names the one a click switches to.
  return (
    <Button
      variant='ghost'
      size='sm'
      iconSize='xs'
      iconOnly
      icon={axis === 'time' ? 'ph--clock--regular' : 'ph--dots-three-outline--regular'}
      label={t(axis === 'time' ? 'gantt-axis-unit.label' : 'gantt-axis-time.label')}
      onClick={() => onAxisChange(axis === 'time' ? 'unit' : 'time')}
      data-testid='gantt.axisToggle'
    />
  );
};

GanttAxisToggle.displayName = 'Gantt.AxisToggle';

//
// LegendToggle
//

type GanttLegendToggleProps = {};

/** Switches the legend's column between the lanes' titles and their stats. */
const GanttLegendToggle = (_: GanttLegendToggleProps) => {
  const { t } = useTranslation(translationKey);
  const { legend, setLegend } = useGanttContext('Gantt.LegendToggle');

  // As the axis toggle: the icon names what is shown, the label what a click shows instead.
  return (
    <Button
      variant='ghost'
      size='sm'
      iconSize='xs'
      iconOnly
      icon={legend === 'title' ? 'ph--text-aa--regular' : 'ph--chart-bar--regular'}
      label={t(legend === 'title' ? 'gantt-legend-stats.label' : 'gantt-legend-title.label')}
      onClick={() => setLegend(legend === 'title' ? 'stats' : 'title')}
      data-testid='gantt.legendToggle'
    />
  );
};

GanttLegendToggle.displayName = 'Gantt.LegendToggle';

//
// Chart
//

type GanttChartProps = ThemedClassName<{}>;

/** One drawn stretch of a lane: where its bar runs, and the nodes threaded through it. */
type Stretch = {
  /** The instants the segment spans, in pixels. */
  from: number;
  to: number;
  /** The drawn positions of the first and last node inside it; absent when it holds fewer than two. */
  threadFrom?: number;
  threadTo?: number;
};

/**
 * The drawing: a lane is a rounded bar per segment with its markers threaded through as nodes, a
 * group's rectangle encloses its band, and connectors draw dependencies and the node a lane opened
 * out of.
 *
 * On the `unit` axis the drawing is as wide as the events need and follows the newest of them in the
 * root's scroll frame, while the legend beside it stays where it is.
 *
 * The drawing is one keyboard stop: clicking a node focuses it, the arrows walk the nodes (left and
 * right along a lane, up and down to the nearest node of the next lane), Space opens the current
 * node's card and Enter selects it — the same keys a legend row answers to.
 */
const GanttChart = forwardRef<SVGSVGElement, GanttChartProps>(({ classNames }, forwardedRef) => {
  const {
    rows,
    bands,
    rowById,
    markers,
    markerById,
    range,
    now,
    showNow,
    axis = 'unit',
    unitStep = UNIT_STEP,
    animate,
    onLaneSelect,
    onMarkerSelect,
    viewport,
  } = useGanttContext('Gantt.Chart');
  const { t } = useTranslation(translationKey);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ref = useComposedRefs(forwardedRef, svgRef);
  const nodeIdPrefix = useId();
  /** The node the keyboard is on, and the node whose card is open (by hover or by Space). */
  const [currentId, setCurrentId] = useState<string>();
  const [openId, setOpenId] = useState<string>();
  const followRef = useRef(true);
  const glideRef = useRef(false);
  const frameRef = useRef<number | undefined>(undefined);
  const drawnRef = useRef<number | undefined>(undefined);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const element = viewport;
    if (!element) {
      return;
    }
    // The time axis is fitted to what the viewport shows beside the legend, not to the drawing, which may be wider.
    const measure = (): void => {
      const svg = svgRef.current;
      const offset = svg
        ? svg.getBoundingClientRect().left - element.getBoundingClientRect().left + element.scrollLeft
        : 0;
      setWidth(Math.max(element.clientWidth - offset, 0));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // Listened for rather than taken as a prop: `ScrollArea.Viewport` accepts only what it slots.
    const onScroll = (): void => {
      const atEdge = element.scrollWidth - element.clientWidth - element.scrollLeft <= FOLLOW_SLACK;
      // A glide of our own emits scroll events all the way there, every one of them short of the
      // edge. Reading those as the reader scrolling away would unpin the chart on the very frame it
      // set out to follow; only its arrival is worth acting on.
      if (glideRef.current) {
        glideRef.current = !atEdge;
        return;
      }
      followRef.current = atEdge;
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', onScroll);
    };
  }, [viewport]);

  /** Each lane's markers in the order they happened: the threads, the bars and the enter origins read it. */
  const laneMarkers = useMemo(() => {
    const byLane = new Map<string, GanttMarker[]>();
    for (const marker of markers) {
      const list = byLane.get(marker.laneId);
      if (list) {
        list.push(marker);
      } else {
        byLane.set(marker.laneId, [marker]);
      }
    }
    for (const list of byLane.values()) {
      list.sort((left, right) => left.timestamp - right.timestamp);
    }
    return byLane;
  }, [markers]);

  // The time axis is fitted to the viewport, so moving bounds rescale everything already drawn;
  // easing the range makes that a slide rather than a jump. The unit axis never rescales.
  // The time axis moves only when something happens: its bounds end at the newest drawn instant (a
  // node or a segment edge) rather than at the host's range, which may follow the wall clock and would
  // rescale an idle chart forever. Open lanes run to that same edge, so none is clipped.
  const lastEvent = useMemo(() => {
    const times = [
      ...markers.map((marker) => marker.timestamp),
      ...rows.flatMap(({ lane }) => (lane.segments ?? []).flatMap(({ start, end }) => [start, end ?? start])),
    ];
    return times.length > 0 ? Math.max(...times) : undefined;
  }, [markers, rows]);
  const targetRange = useMemo(
    () => (lastEvent === undefined ? range : { start: range.start, end: Math.max(lastEvent, range.start) }),
    [range.start, range.end, lastEvent],
  );
  const shownRange = useRangeTween(targetRange, axis === 'time');
  // CSS geometry transitions would chase every frame of that ease and trail behind it, so they run
  // on the unit axis only; the stroke dash drawing a connector on is not geometry and always may.
  const slide = animate === true && axis === 'unit';
  const scale: GanttScale = useMemo(
    () =>
      axis === 'unit'
        ? unitScale({ times: markers.map((marker) => marker.timestamp), step: unitStep, pad: PAD_X })
        : timeScale({ range: shownRange, width, pad: PAD_X }),
    [axis, markers, unitStep, shownRange, width],
  );
  const isEntering = useEnter(markers.map((marker) => marker.id));

  // On the time axis the right edge is "now" — the newest event, where open lanes end. While the range
  // eases toward new bounds, anything newer than the drawn range is held at that edge rather than drawn
  // past it: the new event and the open ends stay pinned while everything older compresses leftward.
  const edge = axis === 'time' ? scale.at(shownRange.end) : undefined;
  const x = (time: number): number => (edge === undefined ? scale.at(time) : Math.min(scale.at(time), edge));
  const rowY = (index: number): number => HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
  const openSource = (lane: GanttLane): GanttMarker | undefined =>
    lane.openedFrom && markerById.get(lane.openedFrom.markerId);

  // Where each node is drawn: its own place, or — for the one frame in which it arrives — the place it
  // came from, which is what the transitions below then travel out of. A lane's first node comes from
  // the node the lane opened out of, so a lane reads as branching from whatever caused it.
  const markerX = new Map<string, number>();
  // The newest node of a lane that is still running: the end the next event will land on, and the
  // one thing in the drawing that is not yet history.
  const activeEdges = new Set<string>();
  for (const [laneId, list] of laneMarkers) {
    const row = rowById.get(laneId);
    if (!row) {
      continue;
    }
    const newest = list[list.length - 1];
    if (row.lane.status === 'running' && newest) {
      activeEdges.add(newest.id);
    }
    list.forEach((marker, index) => {
      const previous = index > 0 ? list[index - 1] : undefined;
      const source = previous ? undefined : openSource(row.lane);
      const origin = previous ? x(previous.timestamp) : source && x(source.timestamp);
      const resting = x(marker.timestamp);
      markerX.set(marker.id, slide && origin !== undefined && isEntering(marker.id) ? origin : resting);
    });
  }

  /**
   * A lane's drawn stretches, one per segment. An open segment reaches its last node, taking the
   * node's drawn position rather than its instant so the bar grows with an arriving event instead of
   * jumping ahead of it — and on to the chart's newest event when that is later.
   */
  const stretchesOf = (lane: GanttLane): Stretch[] => {
    const list = laneMarkers.get(lane.id) ?? [];
    const segments = lane.segments ?? [];
    return segments.map((segment, index) => {
      const upper = segment.end ?? segments[index + 1]?.start ?? Number.MAX_SAFE_INTEGER;
      const inside = list.filter((marker) => marker.timestamp >= segment.start && marker.timestamp <= upper);
      const first = inside[0];
      const last = inside[inside.length - 1];
      const from = x(segment.start);
      // An open stretch runs to its newest node, and on to the newest event anywhere on the chart when
      // that is later: a lane still being worked between its own events (a parent task while its
      // sub-tasks run) is not a point.
      const lastX = last ? (markerX.get(last.id) ?? x(last.timestamp)) : undefined;
      const edgeX = lastEvent !== undefined ? x(lastEvent) : undefined;
      const to =
        segment.end !== undefined
          ? x(segment.end)
          : lastX !== undefined && edgeX !== undefined
            ? Math.max(lastX, edgeX)
            : (lastX ?? edgeX ?? from);
      const threaded = inside.length > 1 && first && last;
      return {
        from,
        to: Math.max(to, from),
        threadFrom: threaded ? markerX.get(first.id) : undefined,
        threadTo: threaded ? markerX.get(last.id) : undefined,
      };
    });
  };

  // A lane whose first node has just arrived is opening: its bar extends from its own beginning
  // rather than appearing at full length, and the connector that caused it draws out to meet it.
  const isOpening = (lane: GanttLane): boolean => {
    const first = laneMarkers.get(lane.id)?.[0];
    return slide && first !== undefined && isEntering(first.id);
  };

  const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT;
  const grow = slide && mx('transition-[width]', ENTER_TRANSITION);

  const nodeIds = useMemo(
    () => new Map(markers.map((marker, index) => [marker.id, `${nodeIdPrefix}-node-${index}`])),
    [markers, nodeIdPrefix],
  );
  const current = currentId === undefined ? undefined : markerById.get(currentId);

  /** The node an arrow key moves to from `from`; `from` itself where there is nowhere further to go. */
  const neighbour = (from: GanttMarker, key: string): GanttMarker => {
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const list = laneMarkers.get(from.laneId) ?? [];
      const index = list.findIndex((marker) => marker.id === from.id);
      return list[index + (key === 'ArrowLeft' ? -1 : 1)] ?? from;
    }
    const row = rowById.get(from.laneId);
    if (!row) {
      return from;
    }
    // The nearest node in drawn position rather than in time: on the unit axis the two disagree, and
    // the reader is following what they see.
    const fromX = markerX.get(from.id) ?? x(from.timestamp);
    const distance = (marker: GanttMarker): number => Math.abs((markerX.get(marker.id) ?? x(marker.timestamp)) - fromX);
    const direction = key === 'ArrowUp' ? -1 : 1;
    // Lanes with no nodes are passed over: there is nothing on them to land on.
    for (let index = row.index + direction; index >= 0 && index < rows.length; index += direction) {
      const list = laneMarkers.get(rows[index].lane.id) ?? [];
      if (list.length > 0) {
        return list.reduce((best, marker) => (distance(marker) < distance(best) ? marker : best));
      }
    }
    return from;
  };

  /** Scrolls the frame just enough to show `marker` clear of the sticky legend and the frame's edges. */
  const reveal = (marker: GanttMarker): void => {
    const svg = svgRef.current;
    const row = rowById.get(marker.laneId);
    const cx = markerX.get(marker.id);
    if (!viewport || !svg || !row || cx === undefined) {
      return;
    }
    const frame = viewport.getBoundingClientRect();
    const drawing = svg.getBoundingClientRect();
    const legendWidth = drawing.left - frame.left + viewport.scrollLeft;
    const nodeX = drawing.left - frame.left + cx;
    const nodeY = drawing.top - frame.top + rowY(row.index);
    const margin = ROW_HEIGHT;
    const left =
      nodeX - margin < legendWidth
        ? nodeX - margin - legendWidth
        : nodeX + margin > viewport.clientWidth
          ? nodeX + margin - viewport.clientWidth
          : 0;
    const top =
      nodeY - margin < 0
        ? nodeY - margin
        : nodeY + margin > viewport.clientHeight
          ? nodeY + margin - viewport.clientHeight
          : 0;
    if (left !== 0 || top !== 0) {
      viewport.scrollBy({ left, top });
    }
  };

  const moveTo = (marker: GanttMarker): void => {
    setCurrentId(marker.id);
    // An open card travels with the current node.
    setOpenId((open) => (open === undefined ? undefined : marker.id));
    reveal(marker);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        event.preventDefault();
        // With no node yet, the first lane's newest: the unit axis opens on the present.
        const next = current
          ? neighbour(current, event.key)
          : rows.map(({ lane }) => laneMarkers.get(lane.id)?.at(-1)).find((marker) => marker !== undefined);
        if (next) {
          moveTo(next);
        }
        break;
      }
      case ' ': {
        event.preventDefault();
        if (current) {
          setOpenId((open) => (open === current.id ? undefined : current.id));
        }
        break;
      }
      case 'Escape': {
        if (openId !== undefined) {
          event.preventDefault();
          setOpenId(undefined);
        }
        break;
      }
      case 'Enter': {
        if (current) {
          event.preventDefault();
          onMarkerSelect?.(current);
        }
        break;
      }
    }
  };

  // The unit axis grows to the right, so the newest event has to be followed — but only while the
  // reader is at its edge; having scrolled back, they are reading, not watching. A layout effect, so
  // the first paint already shows the newest events rather than jumping to them from the start.
  useLayoutEffect(() => {
    const element = viewport;
    // Recorded only once there is a frame to scroll, so the first paint with one still opens on the present.
    if (!element) {
      return;
    }
    const previous = drawnRef.current;
    drawnRef.current = scale.width;

    // Opened on the present: what is happening now is what the chart is looked at for. A drawing that
    // fitted until now counts as opening too — its events arrived after mount, and there was no place
    // in it for the reader to keep.
    const grown = previous !== undefined && scale.width > previous;
    if (previous === undefined || (grown && previous <= width)) {
      element.scrollLeft = element.scrollWidth;
      return;
    }

    if (!grown || !followRef.current) {
      return;
    }

    // Glided rather than jumped: the drawing is unchanged to the left of the new event, and a jump
    // asks the reader to re-find their place in it every time one arrives. A reader who asked for
    // less motion gets none.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      element.scrollLeft = element.scrollWidth;
      return;
    }

    // Animated here rather than by `scrollTo({ behavior: 'smooth' })`, whose curve is the browser's
    // own and fixed: it arrives in a fraction of the time the event that caused it takes to settle,
    // so the window lurches ahead of the drawing it is following.
    const from = element.scrollLeft;
    const to = element.scrollWidth - element.clientWidth;
    if (to <= from) {
      return;
    }
    const started = performance.now();
    glideRef.current = true;
    const step = (now: number): void => {
      const progress = Math.min((now - started) / FOLLOW_DURATION, 1);
      // Eased out, the shape everything else in the drawing travels on, so the two agree.
      element.scrollLeft = from + (to - from) * (1 - (1 - progress) ** 3);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        glideRef.current = false;
      }
    };
    frameRef.current = requestAnimationFrame(step);
    // A glide still running when the next event arrives is abandoned where it got to; the glide that
    // replaces it starts from there, so the drift retargets rather than restarting.
    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
      glideRef.current = false;
    };
  }, [scale.width, viewport]);

  return (
    <svg
      // Pixel coordinates against the drawing's own width, with no viewBox: a viewBox would
      // letterbox the drawing to the column's aspect ratio and shrink every node with it. Grows into
      // the row the legend leaves when the events need less.
      className={mx('grow shrink-0 dx-focus-ring', classNames)}
      style={{ width: scale.width, height }}
      tabIndex={0}
      role='group'
      aria-label={t('gantt-chart.label')}
      aria-activedescendant={current ? nodeIds.get(current.id) : undefined}
      onKeyDown={handleKeyDown}
      data-testid='gantt.chart'
      ref={ref}
    >
      {scale.ticks.map(({ at, label }, index) => (
        <g key={index}>
          <line x1={at} x2={at} y1={HEADER_HEIGHT} y2={height} className='stroke-separator' />
          <text
            x={at}
            y={HEADER_HEIGHT - 6}
            // Anchored inward at the drawing's own edges, so no label is drawn outside it.
            textAnchor={at <= PAD_X ? 'start' : at >= scale.width - PAD_X ? 'end' : 'middle'}
            className='fill-current text-fg-subtle'
          >
            {label}
          </text>
        </g>
      ))}

      {/* Under the lanes and connectors: a dependency on a still-running lane anchors at `now`
              and would otherwise be hidden by this line. */}
      {now !== undefined && showNow && (
        <line
          x1={x(now)}
          x2={x(now)}
          y1={0}
          y2={height}
          strokeDasharray='3 3'
          className={STATUS_COLOR.running.thread}
        />
      )}

      {/* A group's rectangle encloses its band — the lanes it holds, and only those: a nested
              group is a band of its own, drawn further down. */}
      {bands.flatMap(({ group, first, last }) => {
        const stretches = rows.slice(first, last + 1).flatMap((row) => stretchesOf(row.lane));
        if (stretches.length === 0) {
          return [];
        }
        const left = Math.min(...stretches.map((stretch) => stretch.from)) - BAR_OVERHANG - GROUP_PAD;
        const right = Math.max(...stretches.map((stretch) => stretch.to)) + BAR_OVERHANG + GROUP_PAD;
        return [
          <rect
            key={`band:${group.id}`}
            x={left}
            y={rowY(first) - ROW_HEIGHT / 2 + GROUP_INSET}
            width={Math.max(right - left, ROW_HEIGHT)}
            height={(last - first + 1) * ROW_HEIGHT - 2 * GROUP_INSET}
            rx={GROUP_RADIUS}
            className={mx('fill-input-surface', grow)}
          />,
        ];
      })}

      {/* Connectors next, so the drop to a lane passes beneath any bar it crosses. */}
      {rows.flatMap(({ lane, index }) =>
        (lane.blockedOn ?? []).flatMap((depId) => {
          const dep = rowById.get(depId);
          if (!dep) {
            return [];
          }
          // Anchored on the end of the dependency's last stretch, so the line meets a node rather
          // than a bar edge.
          const stretches = stretchesOf(dep.lane);
          const anchor = stretches[stretches.length - 1];
          if (!anchor) {
            return [];
          }
          const anchorX = anchor.to;
          return [
            <line
              key={`${lane.id}:${depId}`}
              x1={anchorX}
              x2={anchorX}
              y1={rowY(dep.index)}
              y2={rowY(index)}
              strokeDasharray='2 2'
              className={STATUS_COLOR.blocked.thread}
            />,
            // A waiter with no bar has nothing on its row for the line to reach, so it ends on a
            // hollow node: the point the waiter is held at until the dependency resolves.
            ...((lane.segments ?? []).length === 0
              ? [
                  <circle
                    key={`${lane.id}:${depId}:hold`}
                    cx={anchorX}
                    cy={rowY(index)}
                    r={NODE_RADIUS}
                    className={mx('fill-base-surface', STATUS_COLOR.blocked.thread)}
                  />,
                ]
              : []),
          ];
        }),
      )}

      {/* Down from the node a lane opened out of, a quarter bend, then right to where it begins. */}
      {rows.flatMap(({ lane, index }) => {
        const source = openSource(lane);
        const sourceRow = lane.openedFrom && rowById.get(lane.openedFrom.laneId);
        const stretches = stretchesOf(lane);
        if (!source || !sourceRow || stretches.length === 0) {
          return [];
        }
        const sourceX = x(source.timestamp);
        const y = rowY(index);
        const targetX = stretches[0].from;
        // Down, a quarter bend, then right to where the lane begins — but only while there is
        // somewhere forward to go. A lane that begins at or before the node that opened it has no
        // run to make, and bending anyway would hook the connector sideways into the middle of its
        // own bar; the drop lands on the row instead. The bar stays where the data puts it either
        // way: a connector doubling back over itself reads as a line to somewhere else entirely.
        const path =
          targetX > sourceX + BEND_RADIUS
            ? `M ${sourceX} ${rowY(sourceRow.index)} V ${y - BEND_RADIUS} Q ${sourceX} ${y} ${sourceX + BEND_RADIUS} ${y} H ${targetX}`
            : `M ${sourceX} ${rowY(sourceRow.index)} V ${y}`;
        return [
          <path
            key={`opened:${lane.id}`}
            d={path}
            fill='none'
            // Drawn on by its dash rather than by its shape: `d` is beyond what a transition can
            // reach, while `stroke-dashoffset` is a property every renderer animates. `pathLength`
            // normalises the path to 1 so one dash covers it whatever its actual length — which is
            // also why these are inert, and the connector solid, when it is not opening.
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={isOpening(lane) ? 1 : 0}
            className={mx(animate && mx('transition-[stroke-dashoffset]', ENTER_TRANSITION), CONNECTOR_CLASSNAME)}
          />,
        ];
      })}

      {/* Back out of the lane's last stretch and up into the node its result answered. Dashed, and
              the spawn is not: one is the moment work was handed over, the other the moment an answer
              arrived, and a reader following a cascade needs to tell the two directions apart. */}
      {rows.flatMap(({ lane, index }) => {
        const target = lane.closedInto && markerById.get(lane.closedInto.markerId);
        const targetRow = lane.closedInto && rowById.get(lane.closedInto.laneId);
        const stretches = stretchesOf(lane);
        const last = stretches[stretches.length - 1];
        if (!target || !targetRow || !last) {
          return [];
        }
        const targetX = x(target.timestamp);
        const y = rowY(index);
        const targetY = rowY(targetRow.index);
        // Which way the bend turns depends on whether the answer went up the chart or down it;
        // a lane is normally below the one it reports to, but nothing in the model requires it.
        const rise = Math.sign(targetY - y) * BEND_RADIUS;
        // Forward only, for the same reason the spawn connector is: a run doubling back reads as
        // a line to somewhere else. With nowhere to run, the rise happens at the answer's own node.
        const path =
          targetX > last.to + BEND_RADIUS
            ? `M ${last.to} ${y} H ${targetX - BEND_RADIUS} Q ${targetX} ${y} ${targetX} ${y + rise} V ${targetY}`
            : `M ${targetX} ${y} V ${targetY}`;
        return [
          <path key={`closed:${lane.id}`} d={path} fill='none' strokeDasharray='3 2' className={CONNECTOR_CLASSNAME} />,
        ];
      })}

      {/* One bar per segment: the gaps between them are the stretches the lane was not worked. */}
      {rows.flatMap(({ lane, index }) =>
        stretchesOf(lane).map((stretch, segment) => {
          const start = stretch.from - BAR_OVERHANG;
          const bar = {
            x: start,
            y: rowY(index) - BAR_HEIGHT / 2,
            // An opening lane is a dot at its own beginning for one frame, so it extends from where
            // the connector lands instead of being there at full length before the connector is.
            width: isOpening(lane) ? BAR_HEIGHT : Math.max(stretch.to + BAR_OVERHANG - start, BAR_HEIGHT),
            height: BAR_HEIGHT,
            rx: BAR_HEIGHT / 2,
          };
          // An opaque backing under the translucent tint: the connectors pass beneath the bars, and
          // without it they would show through.
          return (
            <g key={`${lane.id}:${segment}`} className='cursor-pointer' onClick={() => onLaneSelect?.(lane)}>
              <rect {...bar} className={mx('fill-base-surface', grow)} />
              {lane.hue ? (
                <rect {...bar} className={mx(grow)} style={{ fill: hueColor(lane.hue), fillOpacity: 0.4 }} />
              ) : (
                <rect {...bar} className={mx(STATUS_COLOR[lane.status].fill, grow)} />
              )}
            </g>
          );
        }),
      )}

      {/* The thread through a segment's nodes, so a stretch reads as a sequence rather than dots. */}
      {rows.flatMap(({ lane, index }) =>
        stretchesOf(lane).flatMap((stretch, segment) =>
          stretch.threadFrom === undefined || stretch.threadTo === undefined
            ? []
            : [
                // A hairline rect rather than a line: a line's `x1`/`x2` are attributes and nothing
                // else, while `x` and `width` are geometry properties a transition can reach, so the
                // thread grows with the node it is reaching for instead of arriving ahead of it.
                <rect
                  key={`thread:${lane.id}:${segment}`}
                  x={stretch.threadFrom}
                  y={rowY(index) - THREAD_HEIGHT / 2}
                  width={Math.max(stretch.threadTo - stretch.threadFrom, 0)}
                  height={THREAD_HEIGHT}
                  className={mx(
                    slide && mx('transition-[x,width]', ENTER_TRANSITION),
                    !lane.hue && STATUS_COLOR[lane.status].node,
                  )}
                  style={lane.hue ? { fill: hueColor(lane.hue) } : undefined}
                />,
              ],
        ),
      )}

      {/* An answered wait, dashed from the node that began it to the one that ended it, so the stretch
              a task spent held up reads as part of its lane rather than a gap in it. */}
      {markers.flatMap((marker) => {
        const row = marker.wait && rowById.get(marker.laneId);
        const from = markerX.get(marker.id);
        const to = marker.wait && markerX.get(marker.wait.until);
        if (!row || from === undefined || to === undefined || to <= from) {
          return [];
        }
        return [
          <line
            key={`wait:${marker.id}`}
            x1={from}
            x2={to}
            y1={rowY(row.index)}
            y2={rowY(row.index)}
            strokeWidth={2}
            strokeDasharray='4 3'
            className={row.lane.hue ? undefined : STATUS_COLOR[row.lane.status].thread}
            style={row.lane.hue ? { stroke: hueStrongColor(row.lane.hue) } : undefined}
          />,
        ];
      })}

      {/* Nodes last, over the bars and every line, so a line reads as ending at a node's centre. */}
      {markers.map((marker) => {
        const row = rowById.get(marker.laneId);
        const cx = markerX.get(marker.id);
        return row && cx !== undefined ? (
          <Fragment key={marker.id}>
            {/* Pings out from behind the node until answered, so the node itself stays readable. */}
            {marker.pending && (
              <circle
                cx={cx}
                cy={rowY(row.index)}
                r={NODE_RADIUS}
                className='animate-ping transform-fill origin-center pointer-events-none fill-error-500'
              />
            )}
            <HoverCard.Root
              open={openId === marker.id}
              onOpenChange={({ open }) =>
                setOpenId((previous) => (open ? marker.id : previous === marker.id ? undefined : previous))
              }
            >
              <HoverCard.Trigger asChild>
                <circle
                  id={nodeIds.get(marker.id)}
                  role='img'
                  aria-label={marker.label}
                  data-marker-id={marker.id}
                  data-lane-id={marker.laneId}
                  cx={cx}
                  cy={rowY(row.index)}
                  r={NODE_RADIUS}
                  className={mx(
                    'cursor-pointer hover:stroke-[3px] hover:stroke-fg',
                    // A question or an error is ringed in red; an error pulses while its lane stays
                    // failed (an unanswered question pings instead — the ring drawn behind it).
                    isAlert(marker) ? 'stroke-red-500 stroke-2' : 'stroke-base-surface',
                    marker.level === 'error' && row.lane.status === 'failed' && 'animate-pulse',
                    // `cx` as a transition: where a browser exposes SVG geometry as CSS the node
                    // slides out of the one before it, and where it does not it simply appears.
                    slide ? mx('transition-[stroke-width,cx]', ENTER_TRANSITION) : 'transition-[stroke-width]',
                    // The live end pulses in the lane's stronger shade: scanning a wall of finished
                    // lanes, the ones still moving should be findable without reading the legend.
                    // A question or an error is a solid node in the lane's own hue: the same thread,
                    // so it reads as that task's, but the stronger shade so it is found at a glance.
                    activeEdges.has(marker.id)
                      ? mx('animate-pulse', !row.lane.hue && STATUS_COLOR[row.lane.status].edge)
                      : !row.lane.hue &&
                          (isAlert(marker) ? STATUS_COLOR[row.lane.status].edge : STATUS_COLOR[row.lane.status].node),
                    // The keyboard's place, ringed as a hovered node is.
                    marker.id === currentId && 'stroke-[3px] stroke-fg',
                  )}
                  style={
                    row.lane.hue
                      ? { fill: isAlert(marker) ? hueStrongColor(row.lane.hue) : hueColor(row.lane.hue) }
                      : undefined
                  }
                  onClick={() => {
                    setCurrentId(marker.id);
                    svgRef.current?.focus({ preventScroll: true });
                    onMarkerSelect?.(marker);
                  }}
                />
              </HoverCard.Trigger>
              <HoverCard.Content classNames='p-2 max-w-72 text-xs' data-testid='gantt.markerCard'>
                <div className='font-medium truncate'>{marker.label}</div>
                <div className='text-fg-muted truncate'>{row.lane.label}</div>
                <div className='text-fg-muted tabular-nums'>
                  {marker.kind && `${marker.kind} · `}
                  {format(marker.timestamp, 'HH:mm:ss')}
                  {/* Elapsed on the axis's own terms, so it reads against the tick labels. */}
                  {` · +${formatElapsed(marker.timestamp - range.start, { span: marker.timestamp - range.start, step: 1_000 })}`}
                  {marker.level && marker.level !== 'info' && (
                    <span className={mx('ms-2', marker.level === 'error' ? 'text-error-text' : 'text-warning-text')}>
                      {marker.level}
                    </span>
                  )}
                </div>
              </HoverCard.Content>
            </HoverCard.Root>
          </Fragment>
        ) : null;
      })}
    </svg>
  );
});

GanttChart.displayName = 'Gantt.Chart';

export const Gantt = {
  Root: GanttRoot,
  Legend: GanttLegend,
  AxisToggle: GanttAxisToggle,
  LegendToggle: GanttLegendToggle,
  Chart: GanttChart,
};

export type { GanttAxisToggleProps, GanttChartProps, GanttLegendProps, GanttLegendToggleProps, GanttRootProps };
