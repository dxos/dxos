//
// Copyright 2026 DXOS.org
//

//
// The inspector panel: one scrolling column of inspectors, one section each, docked beside the canvas or floating over
// it. It decides which inspectors show; an inspector is plain content that a section frames with its title and
// disclosure, and portals into the panel wherever the panel is placed.
//

import React, {
  type PropsWithChildren,
  type ReactNode,
  type SyntheticEvent,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';

import * as Accordion from '@dxos/react-ui/Accordion';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Splitter from '@dxos/react-ui/Splitter';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { FLOATING_PANEL } from '../../../utils/index.ts';

/** An inspector's section in the panel. */
export type InspectorSectionDef = {
  id: string;
  title: string;
  icon: string;
  /** Sections stack by it, lowest first. */
  order: number;
  /** The half of the panel the section sits in, the two split by a draggable seam; `lower` by default. */
  pane?: 'upper' | 'lower';
  /** Open when it first shows; otherwise it starts closed, so only the inspectors that matter first take room. */
  defaultOpen?: boolean;
};

type InspectorPanelContextValue = {
  docked: boolean;
  readonly: boolean;
  sections: readonly InspectorSectionDef[];
  /** Each section's content slot, by section id. */
  slots: Readonly<Record<string, HTMLElement | null>>;
  closed: ReadonlySet<string>;
  shows: (section: InspectorSectionDef) => boolean;
  register: (section: InspectorSectionDef) => () => void;
  setSlot: (id: string, element: HTMLElement | null) => void;
  setClosed: (closed: ReadonlySet<string>) => void;
  actions?: ReactNode;
  onDockedChange?: (docked: boolean) => void;
};

/**
 * The panel's state behind a stable handle: a section subscribes to its own slot, so a change that leaves its slot as
 * it was (the selection, another section's slot, the panel's actions) does not re-render the inspector inside it.
 */
type InspectorPanelHandle = {
  get: () => InspectorPanelContextValue;
  subscribe: (listener: () => void) => () => void;
  register: InspectorPanelContextValue['register'];
};

const InspectorPanelContext = createContext<InspectorPanelHandle | undefined>(undefined);

const usePanelState = (handle: InspectorPanelHandle | undefined): InspectorPanelContextValue | undefined =>
  useSyncExternalStore(
    useCallback((listener: () => void) => handle?.subscribe(listener) ?? (() => {}), [handle]),
    () => handle?.get(),
  );

export type InspectorPanelRootProps = PropsWithChildren<{
  /** Beside the canvas, rather than floating over it. */
  docked?: boolean;
  /** Read-only, a floating panel shows no section, as the inspectors edit the scene. */
  readonly?: boolean;
  /** Commands on the canvas as a whole (e.g. on the selection), drawn at the start of the panel's toolbar. */
  actions?: ReactNode;
  /** Offered, the panel's toolbar docks a floating panel, or floats a docked one. */
  onDockedChange?: (docked: boolean) => void;
}>;

/** Holds the inspectors' sections and decides which show, for the panel and the sections inside it. */
const InspectorPanelRoot = ({
  docked = false,
  readonly = false,
  actions,
  onDockedChange,
  children,
}: InspectorPanelRootProps) => {
  const [sections, setSections] = useState<InspectorSectionDef[]>([]);
  const [slots, setSlots] = useState<Record<string, HTMLElement | null>>({});
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  // Sections seen before, so one starts closed (unless `defaultOpen`) only the first time it registers.
  const seen = useRef(new Set<string>());
  // Docked or floating, the same sections show: where the panel sits is not what it holds.
  const shows = useCallback(() => docked || !readonly, [docked, readonly]);
  const register = useCallback((section: InspectorSectionDef) => {
    if (!seen.current.has(section.id)) {
      seen.current.add(section.id);
      if (!section.defaultOpen) {
        setClosed((current) => new Set([...current, section.id]));
      }
    }
    setSections((current) =>
      [...current.filter((entry) => entry.id !== section.id), section].sort((left, right) => left.order - right.order),
    );
    return () => setSections((current) => current.filter((entry) => entry.id !== section.id));
  }, []);
  const setSlot = useCallback(
    (id: string, element: HTMLElement | null) =>
      setSlots((current) => (current[id] === element ? current : { ...current, [id]: element })),
    [],
  );
  const value = useMemo(
    () => ({ docked, readonly, sections, slots, closed, shows, register, setSlot, setClosed, actions, onDockedChange }),
    [docked, readonly, sections, slots, closed, shows, register, setSlot, actions, onDockedChange],
  );
  // Read during render by the subscribers, which are then told of the change once it commits.
  const valueRef = useRef(value);
  valueRef.current = value;
  const listeners = useRef(new Set<() => void>());
  const handle = useMemo<InspectorPanelHandle>(
    () => ({
      get: () => valueRef.current,
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
      register,
    }),
    [register],
  );
  useLayoutEffect(() => listeners.current.forEach((listener) => listener()), [value]);
  return <InspectorPanelContext.Provider value={handle}>{children}</InspectorPanelContext.Provider>;
};

InspectorPanelRoot.displayName = 'InspectorPanel.Root';

/** A slot the panel draws for a section; its ref callback is stable, since a new one each render would loop. */
const Slot = ({
  id,
  setSlot,
  className,
}: {
  id: string;
  setSlot: InspectorPanelContextValue['setSlot'];
  className?: string;
}) => {
  const ref = useCallback((element: HTMLDivElement | null) => setSlot(id, element), [id, setSlot]);
  return <div ref={ref} className={className} />;
};

/** Stops a section's events at the panel: through the portal they would reach the canvas root (hover, menus). */
const stop = (event: SyntheticEvent) => event.stopPropagation();

/**
 * The panel itself, wherever the host places it: a toolbar with the dock toggle above a padded scroll area of the
 * sections that show, each a bordered frame as tall as its inspector, any number open. Nothing (and no space) while
 * none shows.
 */
/** The upper half's share of the height until the seam is dragged; the least either half may be dragged to, in rem. */
const UPPER_PANE_SHARE = 0.6;
const MIN_PANE_SIZE = 6;

/** The seam in the docked panel's own edge colour, brightening as the splitter's does. */
const SEAM = 'before:bg-separator-subtle hover:before:bg-focus focus-visible:before:bg-focus active:before:bg-focus';

const InspectorPanelContent = () => {
  const context = usePanelState(useContext(InspectorPanelContext));
  const visible = useMemo(
    () => context?.sections.filter((section) => context.shows(section)) ?? [],
    [context?.sections, context?.shows],
  );
  // Kept here, not in the splitter, so the upper half keeps its height while a selection comes and goes; unset until
  // the panel is measured, when it starts at its share of the height.
  const [size, setSize] = useState<number>();
  const splitterRef = useRef<HTMLDivElement>(null);
  const measured = size !== undefined;
  useLayoutEffect(() => {
    const height = splitterRef.current?.getBoundingClientRect().height ?? 0;
    if (!measured && height > 0) {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setSize((height * UPPER_PANE_SHARE) / rem);
    }
  });
  if (!context || visible.length === 0) {
    return null;
  }
  const { docked, closed, setSlot, setClosed, actions, onDockedChange } = context;
  const upper = visible.filter((section) => section.pane === 'upper');
  const lower = visible.filter((section) => section.pane !== 'upper');

  // One half's sections: a scroll area of bordered frames, each as tall as its inspector, any number open.
  const list = (sections: readonly InspectorSectionDef[]) => (
    <ScrollArea.Root>
      <ScrollArea.Viewport>
        <Accordion.Root
          border={false}
          classNames='gap-2 p-2'
          onPointerDown={stop}
          onPointerMove={stop}
          onPointerUp={stop}
          onDoubleClick={stop}
          onContextMenu={stop}
          onKeyDown={stop}
          value={sections.filter((section) => !closed.has(section.id)).map((section) => section.id)}
          onValueChange={(open) =>
            setClosed(
              new Set([
                ...[...closed].filter((id) => !sections.some((section) => section.id === id)),
                ...sections.filter((section) => !open.includes(section.id)).map((section) => section.id),
              ]),
            )
          }
        >
          {sections.map((section) => (
            // Each section is its own bordered frame, clipped so its rows' fills stay inside the rounded border; its
            // header holds only the label and disclosure.
            <Accordion.Item
              key={section.id}
              value={section.id}
              classNames='rounded-sm border border-separator overflow-clip'
              data-testid={`dock-section-${section.id}`}
            >
              <Accordion.ItemTrigger icon={section.icon} classNames='bg-toolbar-surface'>
                {section.title}
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Slot id={section.id} setSlot={setSlot} />
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );

  return (
    <Panel.Root
      classNames={
        docked
          ? 'w-80 shrink-0 border-l border-separator-subtle bg-base-surface'
          : // The docked panel's surface, so the inspectors look the same wherever the panel sits. Clipped rather than
            // hidden: a hidden box still scrolls, so focusing a control (a switch's input) would scroll the whole panel.
            mx(
              // As tall as its sections, and never past the bottom toolbars, so they stay reachable.
              'absolute top-2 right-2 z-10 w-80 h-auto max-h-[calc(100%-4.25rem)] overflow-clip',
              FLOATING_PANEL,
              'bg-base-surface',
            )
      }
      data-testid='scene-view-dock'
      data-floating={!docked || undefined}
    >
      {(actions || onDockedChange) && (
        <Panel.Header asChild>
          <Toolbar.Root data-testid='dock-toolbar'>
            {actions}
            <Toolbar.Separator variant='gap' />
            {!onDockedChange ? null : docked ? (
              <Button.Root
                variant='ghost'
                iconOnly
                icon='ph--arrow-square-out--regular'
                label='Float the inspectors over the canvas'
                data-testid='dock-close'
                onClick={() => onDockedChange(false)}
              />
            ) : (
              <Button.Root
                variant='ghost'
                iconOnly
                icon='ph--sidebar-simple--regular'
                label='Dock the inspectors beside the canvas'
                data-testid='dock-open'
                onClick={() => onDockedChange(true)}
              />
            )}
          </Toolbar.Root>
        </Panel.Header>
      )}
      {/* Docked, the panel splits, even while a half is empty, so the halves keep their place and size as the selection
          comes and goes; floating, it is one scrolling list as tall as its sections. */}
      <Panel.Body asChild>
        {docked ? (
          <Splitter.Root
            ref={splitterRef}
            orientation='vertical'
            resizable
            minSize={MIN_PANE_SIZE}
            size={size}
            onSizeChange={setSize}
          >
            <Splitter.Panel position='start'>{list(upper)}</Splitter.Panel>
            <Splitter.ResizeTrigger classNames={SEAM} aria-label='Resize the inspectors' data-testid='dock-splitter' />
            <Splitter.Panel position='end'>{list(lower)}</Splitter.Panel>
          </Splitter.Root>
        ) : (
          list(visible)
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

InspectorPanelContent.displayName = 'InspectorPanel.Content';

export type InspectorPanelFrameProps = Util.ThemedClassName<
  PropsWithChildren<{
    /** Paints no surface of its own, so whatever is behind the view shows through (a slide). */
    transparent?: boolean;
  }>
>;

/**
 * Where a view and its inspector panel sit: the view first, then the panel, docked beside it (taking its own width) or
 * floating over it; any view, 2D or 3D, uses it, so the panel sits and docks the same in each.
 */
const InspectorPanelFrame = ({ classNames, transparent, children }: InspectorPanelFrameProps) => (
  // Clipped rather than hidden: a hidden box still scrolls, so focusing content embedded in the view (an editor's caret)
  // would scroll the whole frame to reveal it.
  <div className={mx('relative flex dx-fill overflow-clip', !transparent && 'bg-base-surface', classNames)}>
    {children}
    <InspectorPanelContent />
  </div>
);

InspectorPanelFrame.displayName = 'InspectorPanel.Frame';

/** Whether the enclosing panel is docked; outside a panel, false. */
const useInspectorPanelDocked = (): boolean => usePanelState(useContext(InspectorPanelContext))?.docked ?? false;

export const InspectorPanel = {
  Root: InspectorPanelRoot,
  Frame: InspectorPanelFrame,
  Content: InspectorPanelContent,
  useDocked: useInspectorPanelDocked,
};

//
// Section
//

export type InspectorSectionProps = PropsWithChildren<{ section: InspectorSectionDef }>;

/**
 * Frames one inspector in the panel: registers its section (label and disclosure; later tabs, for several inspectors in
 * one frame) and renders the inspector into it while the panel shows it. The inspector draws its own toolbar. Outside a
 * panel, the inspector renders where it is.
 */
export const InspectorSection = ({ section, children }: InspectorSectionProps) => {
  const panel = useContext(InspectorPanelContext);
  const { id, title, icon, order, pane, defaultOpen } = section;
  const subscribe = useCallback((listener: () => void) => panel?.subscribe(listener) ?? (() => {}), [panel]);
  const slot = useSyncExternalStore(subscribe, () => {
    const state = panel?.get();
    return state?.shows(section) ? state.slots[id] : undefined;
  });
  useLayoutEffect(() => {
    if (!panel) {
      return;
    }
    return panel.register({ id, title, icon, order, pane, defaultOpen });
    // `register` is stable; the section re-registers only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel?.register, id, title, icon, order, pane, defaultOpen]);
  if (!panel) {
    return <>{children}</>;
  }
  return slot ? createPortal(children, slot) : null;
};
