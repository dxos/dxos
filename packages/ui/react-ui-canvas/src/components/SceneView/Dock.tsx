//
// Copyright 2026 DXOS.org
//

//
// The dock: one scrolling column of the inspectors, one accordion section each, beside the canvas when docked or floating
// over it. An inspector registers its section and portals itself into the section's slot.
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
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { FLOATING_PANEL } from '../../utils/chrome.ts';

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

export type DockProps = {
  /** Over the canvas, sized to its sections up to the view's height, rather than a column beside it. */
  floating?: boolean;
  /** Offered, the dock's toolbar docks a floating dock, or floats a docked one. */
  onDockedChange?: (docked: boolean) => void;
};

/**
 * The dock: a toolbar above an accordion of the registered sections, any number open, each as tall as its panel, the
 * column scrolling them together. Nothing (and no space) while no section shows.
 */
export const Dock = ({ floating = false, onDockedChange }: DockProps) => {
  const dock = useContext(DockContext);
  if (!dock || dock.sections.length === 0) {
    return null;
  }
  const { sections, closed, setSlot, setClosed } = dock;
  return (
    <Panel.Root
      classNames={
        floating
          ? mx('absolute top-2 right-2 z-10 w-80 h-auto max-h-[calc(100%-1rem)] overflow-hidden', FLOATING_PANEL)
          : 'w-80 shrink-0 border-l border-separator-subtle bg-base-surface'
      }
      data-testid='scene-view-dock'
      data-floating={floating || undefined}
    >
      {onDockedChange && (
        <Panel.Header asChild>
          <Toolbar.Root data-testid='dock-toolbar'>
            <Toolbar.Separator variant='gap' />
            {floating ? (
              <Button.Root
                variant='ghost'
                iconOnly
                icon='ph--sidebar-simple--regular'
                label='Dock the inspectors beside the canvas'
                data-testid='dock-open'
                onClick={() => onDockedChange(true)}
              />
            ) : (
              <Button.Root
                variant='ghost'
                iconOnly
                icon='ph--arrow-square-out--regular'
                label='Float the inspectors over the canvas'
                data-testid='dock-close'
                onClick={() => onDockedChange(false)}
              />
            )}
          </Toolbar.Root>
        </Panel.Header>
      )}
      {/* The body is the scroll area itself: each section is as tall as its panel, and it scrolls them together. */}
      <Panel.Body asChild>
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
                  new Set(sections.filter((section) => !open.includes(section.id)).map((section) => section.id)),
                )
              }
            >
              {sections.map((section) => (
                // Framed like a floating inspector, so each docked panel reads as its own card; clipped so its rows' fills
                // and lines stay inside the rounded border.
                <Accordion.Item
                  key={section.id}
                  value={section.id}
                  classNames='rounded-sm border border-separator overflow-hidden'
                  data-testid={`dock-section-${section.id}`}
                >
                  {/* The toolbar's tone, so a section's header and its panel's toolbar read as one bar. */}
                  <Accordion.ItemTrigger icon={section.icon} classNames='bg-toolbar-surface'>
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
      </Panel.Body>
    </Panel.Root>
  );
};

/** Registers a section while `shown`, and renders `panel` into it as a portal once its slot mounts. */
export const useDockSection = (section: DockSection, shown: boolean, panel: ReactNode): ReactNode | null => {
  const dock = useContext(DockContext);
  const { id, title, icon, order } = section;
  useLayoutEffect(() => {
    if (!dock || !shown) {
      return;
    }
    return dock.register({ id, title, icon, order });
    // `register` is stable; the section re-registers only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dock?.register, shown, id, title, icon, order]);
  if (!shown) {
    return null;
  }
  const slot = dock?.slots[id];
  return slot ? createPortal(panel, slot) : null;
};
