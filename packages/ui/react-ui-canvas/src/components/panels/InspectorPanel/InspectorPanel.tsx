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
  type SyntheticEvent,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import * as Accordion from '@dxos/react-ui/Accordion';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { FLOATING_PANEL } from '../../../utils/index.ts';

/** An inspector's section in the panel. */
export type InspectorSectionDef = {
  id: string;
  title: string;
  icon: string;
  /** Sections stack by it, lowest first. */
  order: number;
  /** While the panel floats, when the section shows; docked, every section does. */
  show: 'selection' | 'empty' | 'never';
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
  onDockedChange?: (docked: boolean) => void;
};

const InspectorPanelContext = createContext<InspectorPanelContextValue | undefined>(undefined);

export type InspectorPanelRootProps = PropsWithChildren<{
  /** Beside the canvas, rather than floating over it. */
  docked?: boolean;
  /** Read-only, a floating panel shows no section, as the inspectors edit the scene. */
  readonly?: boolean;
  /** Whether anything is selected, for the sections that float only with (or without) a selection. */
  selected?: boolean;
  /** Offered, the panel's toolbar docks a floating panel, or floats a docked one. */
  onDockedChange?: (docked: boolean) => void;
}>;

/** Holds the inspectors' sections and decides which show, for the panel and the sections inside it. */
const InspectorPanelRoot = ({
  docked = false,
  readonly = false,
  selected = false,
  onDockedChange,
  children,
}: InspectorPanelRootProps) => {
  const [sections, setSections] = useState<InspectorSectionDef[]>([]);
  const [slots, setSlots] = useState<Record<string, HTMLElement | null>>({});
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  // Sections seen before, so one starts closed (unless `defaultOpen`) only the first time it registers.
  const seen = useRef(new Set<string>());
  const shows = useCallback(
    (section: InspectorSectionDef) =>
      docked || (!readonly && (section.show === 'selection' ? selected : section.show === 'empty' ? !selected : false)),
    [docked, readonly, selected],
  );
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
    () => ({ docked, readonly, sections, slots, closed, shows, register, setSlot, setClosed, onDockedChange }),
    [docked, readonly, sections, slots, closed, shows, register, setSlot, onDockedChange],
  );
  return <InspectorPanelContext.Provider value={value}>{children}</InspectorPanelContext.Provider>;
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
const InspectorPanelContent = () => {
  const context = useContext(InspectorPanelContext);
  const visible = useMemo(
    () => context?.sections.filter((section) => context.shows(section)) ?? [],
    [context?.sections, context?.shows],
  );
  if (!context || visible.length === 0) {
    return null;
  }
  const { docked, closed, setSlot, setClosed, onDockedChange } = context;
  return (
    <Panel.Root
      classNames={
        docked
          ? 'w-80 shrink-0 border-l border-separator-subtle bg-base-surface'
          : // The docked panel's surface, so the inspectors look the same wherever the panel sits.
            mx(
              'absolute top-2 right-2 z-10 w-80 h-auto max-h-[calc(100%-1rem)] overflow-hidden',
              FLOATING_PANEL,
              'bg-base-surface',
            )
      }
      data-testid='scene-view-dock'
      data-floating={!docked || undefined}
    >
      {onDockedChange && (
        <Panel.Header asChild>
          <Toolbar.Root data-testid='dock-toolbar'>
            <Toolbar.Separator variant='gap' />
            {docked ? (
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
      {/* The body is the scroll area itself: each section is as tall as its inspector, and it scrolls them together. */}
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
              value={visible.filter((section) => !closed.has(section.id)).map((section) => section.id)}
              onValueChange={(open) =>
                setClosed(new Set(visible.filter((section) => !open.includes(section.id)).map((section) => section.id)))
              }
            >
              {visible.map((section) => (
                // Each section is its own bordered frame, clipped so its rows' fills stay inside the rounded border; its
                // header holds only the label and disclosure.
                <Accordion.Item
                  key={section.id}
                  value={section.id}
                  classNames='rounded-sm border border-separator overflow-hidden'
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
      </Panel.Body>
    </Panel.Root>
  );
};

InspectorPanelContent.displayName = 'InspectorPanel.Content';

export const InspectorPanel = {
  Root: InspectorPanelRoot,
  Content: InspectorPanelContent,
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
  const { id, title, icon, order, show, defaultOpen } = section;
  useLayoutEffect(() => {
    if (!panel) {
      return;
    }
    return panel.register({ id, title, icon, order, show, defaultOpen });
    // `register` is stable; the section re-registers only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel?.register, id, title, icon, order, show, defaultOpen]);
  if (!panel) {
    return <>{children}</>;
  }
  const slot = panel.shows(section) ? panel.slots[id] : undefined;
  return slot ? createPortal(children, slot) : null;
};
