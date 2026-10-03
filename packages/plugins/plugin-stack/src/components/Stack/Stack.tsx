//
// Copyright 2024 DXOS.org
//

import React, {
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as AttentionSigil from '@dxos/app-toolkit/AttentionSigil';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Obj } from '@dxos/echo';
import { Icon, Menu, ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { type DndContainerHandler } from '@dxos/react-ui-dnd';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';

import { meta } from '#meta';

import { StackContext, useStack, useStackContext } from './StackContext.ts';

//
// Types
//

export type StackSectionItem = {
  id: string;
  object: Obj.Unknown;
};

//
// Context
//

/** Section-level callbacks consumed by stack sections. */
export type StackContextValue = {
  attendableId: string;
  /** Ids of sections that are currently collapsed. */
  collapsed: ReadonlySet<string>;
  onCollapse: (id: string, collapsed: boolean) => void;
  /** Add a new section immediately after the given section. */
  onAdd: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
};

export type StackContextType = StackContextValue & {
  /** Container id used to scope Mosaic drag/drop. */
  id: string;
  eventHandler: DndContainerHandler;
  /** Scroll viewport element; threaded to the Mosaic container for autoscroll. */
  viewport: HTMLElement | null;
  setViewport: (element: HTMLElement | null) => void;
};

//
// Root
//

type StackRootProps = PropsWithChildren<
  StackContextValue & {
    /** Container id used to scope Mosaic drag/drop. */
    id: string;
    /** Drag/drop event handler; defaults to a read-only (no-drop) handler. */
    eventHandler?: DndContainerHandler;
  }
>;

const StackRoot = ({
  id,
  eventHandler,
  children,
  attendableId,
  collapsed,
  onCollapse,
  onAdd,
  onMoveUp,
  onMoveDown,
  onDelete,
}: StackRootProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const value = useMemo<StackContextType>(
    () => ({
      id,
      eventHandler: eventHandler ?? { id, canDrop: () => false },
      viewport,
      setViewport,
      attendableId,
      collapsed,
      onCollapse,
      onAdd,
      onMoveUp,
      onMoveDown,
      onDelete,
    }),
    [id, eventHandler, viewport, attendableId, collapsed, onCollapse, onAdd, onMoveUp, onMoveDown, onDelete],
  );

  return <StackContext.Provider value={value}>{children}</StackContext.Provider>;
};

StackRoot.displayName = 'Stack.Root';

//
// Content
//

type StackContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const StackContent = forwardRef<HTMLDivElement, StackContentProps>(({ children, ...props }, forwardedRef) => {
  const { eventHandler, viewport } = useStackContext('Stack.Content');
  return (
    <Mosaic.Container asChild orientation='vertical' autoScroll={viewport} eventHandler={eventHandler}>
      <ScrollArea.Root {...props} orientation='vertical' ref={forwardedRef}>
        {children}
      </ScrollArea.Root>
    </Mosaic.Container>
  );
});

StackContent.displayName = 'Stack.Content';

//
// Viewport
//

type StackViewportProps = ThemedClassName<PropsWithChildren>;

const StackViewport = forwardRef<HTMLDivElement, StackViewportProps>(
  ({ classNames, children }, forwardedRef: ForwardedRef<HTMLDivElement>) => {
    const { setViewport } = useStackContext('Stack.Viewport');
    // Capture the viewport element for autoscroll while still honouring a forwarded ref.
    const setRefs = useCallback(
      (element: HTMLDivElement | null) => {
        setViewport(element);
        if (typeof forwardedRef === 'function') {
          forwardedRef(element);
        } else if (forwardedRef) {
          forwardedRef.current = element;
        }
      },
      [setViewport, forwardedRef],
    );

    return (
      <ScrollArea.Viewport classNames={classNames} ref={setRefs}>
        {children}
      </ScrollArea.Viewport>
    );
  },
);

StackViewport.displayName = 'Stack.Viewport';

//
// Section
//

type StackSectionProps = MosaicTileProps<StackSectionItem>;

/**
 * A stack section rendered as a Mosaic tile: a 40px left rail (drag handle + section menu) beside the
 * main content area, which renders the object's content surface (or its title when collapsed). The
 * rail sticks to the top of the scroll viewport while the section is in view.
 */
// TODO(burdon): All sections are intrinsic (content-sized) for now. Extrinsic content (e.g. a sketch
//   with no intrinsic height) should later get a Mosaic-native resizable height affordance.

// Inline grip glyph for the drag preview. The native drag image does not rasterize external SVG sprite
// `<use>` icons (e.g. `@dxos/react-ui` `Icon`), so the preview uses plain inline SVG circles instead.
const DragHandleGlyph = () => (
  <svg width={10} height={16} viewBox='0 0 10 16' aria-hidden className='shrink-0 text-fg-muted'>
    {[3, 8, 13].flatMap((cy) =>
      [2.5, 7.5].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.1} fill='currentColor' />),
    )}
  </svg>
);

const StackSection = ({ data, ...tileProps }: StackSectionProps) => {
  const { id, object } = data;
  const { t } = useTranslation(meta.profile.key);
  const { attendableId: parentAttendableId, collapsed, onAdd, onMoveUp, onMoveDown, onCollapse, onDelete } = useStack();
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const attendableId = GraphPath.getCollectionObjectPath(parentAttendableId, object.id);
  const attentionAttrs = useAttentionAttributes(attendableId);
  const surfaceData = useMemo(() => ({ attendableId, subject: object }), [object, attendableId]);
  const isCollapsed = collapsed.has(id);
  const icon = Obj.getIcon(object)?.icon ?? 'ph--circle-dashed--regular';
  const title = Obj.getLabel(object, { fallback: 'typename' }) ?? t('untitled-section.title');

  const rail = (
    <div className='grid grid-rows-[min-content_1fr]'>
      <div className='p-1 dx-toolbar-surface'>
        <Menu.Root open={optionsMenuOpen} onOpenChange={({ open }) => setOptionsMenuOpen(open)}>
          <Menu.Trigger asChild>
            <AttentionSigil.Button size='md' attendableId={attendableId}>
              <Icon icon={icon} classNames='transition-opacity' />
            </AttentionSigil.Button>
          </Menu.Trigger>
          <Menu.Content>
            {isCollapsed ? (
              <Menu.Item
                item={{
                  value: 'section.expand',
                  label: t('expand.label'),
                  icon: 'ph--arrows-out-line-vertical--regular',
                }}
                onClick={() => onCollapse(id, false)}
                data-testid='section.expand'
              />
            ) : (
              <Menu.Item
                item={{
                  value: 'section.collapse',
                  label: t('collapse.label'),
                  icon: 'ph--arrows-in-line-vertical--regular',
                }}
                onClick={() => onCollapse(id, true)}
                data-testid='section.collapse'
              />
            )}
            <Menu.Separator />
            <Menu.Item
              item={{ value: 'section.add', label: t('add-section.label'), icon: 'ph--plus--regular' }}
              onClick={() => onAdd(id)}
              data-testid='section.add'
            />
            <Menu.Item
              item={{ value: 'section.move-up', label: t('move-up.label'), icon: 'ph--arrow-line-up--regular' }}
              onClick={() => onMoveUp(id)}
              data-testid='section.move-up'
            />
            <Menu.Item
              item={{ value: 'section.move-down', label: t('move-down.label'), icon: 'ph--arrow-line-down--regular' }}
              onClick={() => onMoveDown(id)}
              data-testid='section.move-down'
            />
            <Menu.Separator />
            <Menu.Item
              item={{ value: 'section.remove', label: t('remove-section.label'), icon: 'ph--trash--regular' }}
              onClick={() => onDelete(id)}
              data-testid='section.remove'
            />
          </Menu.Content>
        </Menu.Root>
      </div>
      <div className='p-1'>
        {/* Inline glyph (not a sprite `Icon`) so the handle stays visible in the tile's native drag image. */}
        <Mosaic.DragHandle
          label={t('drag-handle.label')}
          classNames='p-1 min-h-0 w-(--dx-rail-item) h-(--dx-rail-item)'
          testId='section.drag-handle'
        >
          <DragHandleGlyph />
        </Mosaic.DragHandle>
      </div>
    </div>
  );

  return (
    <Mosaic.Tile
      {...tileProps}
      data={data}
      classNames='grid grid-cols-[var(--dx-rail-action)_1fr] dx-attention-surface border border-separator-subtle'
    >
      <div className='border-e border-separator-subtle'>
        <div className='sticky top-0 flex flex-col items-center'>{rail}</div>
      </div>
      <div {...attentionAttrs} className='min-w-0'>
        <span className='sr-only'>{title}</span>
        {isCollapsed ? (
          <div className='h-(--dx-toolbar-size) flex p-1'>
            <h2 className='flex items-center font-medium'>{title}</h2>
          </div>
        ) : (
          <Surface.Surface type={AppSurface.Section} data={surfaceData} limit={1} />
        )}
      </div>
    </Mosaic.Tile>
  );
};

StackSection.displayName = 'Stack.Section';

//
// Stack
//

export const Stack = {
  Root: StackRoot,
  Content: StackContent,
  Viewport: StackViewport,
  Section: StackSection,
};

export type { StackContentProps, StackRootProps, StackSectionProps, StackViewportProps };
