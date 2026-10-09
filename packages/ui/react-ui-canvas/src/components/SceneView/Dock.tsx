//
// Copyright 2026 DXOS.org
//

//
// The dock: a column beside the canvas that panels move into when the view's panels are docked, one accordion
// section per panel. A panel registers its section and portals itself into the section's slot.
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
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import * as Accordion from '@dxos/react-ui/Accordion';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

/** A panel's section in the dock. */
export type DockSection = {
  id: string;
  title: string;
  icon: string;
  /** Sections stack by it, lowest first. */
  order: number;
};

type DockContextValue = {
  sections: readonly DockSection[];
  slots: Readonly<Record<string, HTMLDivElement | null>>;
  closed: ReadonlySet<string>;
  register: (section: DockSection) => () => void;
  setSlot: (id: string, element: HTMLDivElement | null) => void;
  setClosed: (closed: ReadonlySet<string>) => void;
};

const DockContext = createContext<DockContextValue | undefined>(undefined);

/** Holds the docked sections and their slots for a view's `Dock` and its panels. */
export const DockProvider = ({ children }: PropsWithChildren) => {
  const [sections, setSections] = useState<DockSection[]>([]);
  const [slots, setSlots] = useState<Record<string, HTMLDivElement | null>>({});
  // Closed rather than open, so a section that docks later starts open.
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const register = useCallback((section: DockSection) => {
    setSections((current) =>
      [...current.filter((entry) => entry.id !== section.id), section].sort((left, right) => left.order - right.order),
    );
    return () => setSections((current) => current.filter((entry) => entry.id !== section.id));
  }, []);
  const setSlot = useCallback(
    (id: string, element: HTMLDivElement | null) =>
      setSlots((current) => (current[id] === element ? current : { ...current, [id]: element })),
    [],
  );
  const value = useMemo(
    () => ({ sections, slots, closed, register, setSlot, setClosed }),
    [sections, slots, closed, register, setSlot],
  );
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
};

/** A section's slot; its ref callback is stable, since a new one each render would detach and reattach (a loop). */
const DockSlot = ({ id, setSlot }: { id: string; setSlot: DockContextValue['setSlot'] }) => {
  const ref = useCallback((element: HTMLDivElement | null) => setSlot(id, element), [id, setSlot]);
  return <div ref={ref} />;
};

/** Stops a docked panel's events at the dock: through the portal they would reach the canvas root (hover, menus). */
const stop = (event: SyntheticEvent) => event.stopPropagation();

/**
 * The dock column: an accordion of the registered sections, any number open, each as tall as its panel, the column
 * scrolling them together. Nothing (and no space) while no panel is docked.
 */
export const Dock = () => {
  const dock = useContext(DockContext);
  if (!dock || dock.sections.length === 0) {
    return null;
  }
  const { sections, closed, setSlot, setClosed } = dock;
  return (
    // The column is the scroll area itself: each section is as tall as its panel, and it scrolls them together.
    <ScrollArea.Root classNames='w-80 shrink-0 border-l border-separator bg-base-surface' data-testid='scene-view-dock'>
      <ScrollArea.Viewport>
        <Accordion.Root
          border={false}
          onPointerDown={stop}
          onPointerMove={stop}
          onPointerUp={stop}
          onDoubleClick={stop}
          onContextMenu={stop}
          onKeyDown={stop}
          value={sections.filter((section) => !closed.has(section.id)).map((section) => section.id)}
          onValueChange={(open) =>
            setClosed(new Set(sections.filter((section) => !open.includes(section.id)).map((section) => section.id)))
          }
        >
          {sections.map((section) => (
            <Accordion.Item key={section.id} value={section.id} data-testid={`dock-section-${section.id}`}>
              {/* A distinct surface, so a section's header reads apart from its panel's own toolbar. */}
              <Accordion.ItemTrigger icon={section.icon} classNames='bg-group-surface'>
                {section.title}
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <DockSlot id={section.id} setSlot={setSlot} />
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

/**
 * Registers a section while `docked`, and renders `panel` into it: docked, the panel's portal into the dock (once its
 * slot mounts); floating, `null`, so the caller renders the panel where it floats.
 */
export const useDockSection = (section: DockSection, docked: boolean, panel: ReactNode): ReactNode | null => {
  const dock = useContext(DockContext);
  const { id, title, icon, order } = section;
  useLayoutEffect(() => {
    if (!dock || !docked) {
      return;
    }
    return dock.register({ id, title, icon, order });
    // `register` is stable; the section re-registers only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dock?.register, docked, id, title, icon, order]);
  if (!docked) {
    return null;
  }
  const slot = dock?.slots[id];
  return slot ? createPortal(panel, slot) : null;
};
