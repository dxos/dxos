//
// Copyright 2024 DXOS.org
//

import React, {
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  type PropsWithChildren,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Paths } from '@dxos/app-toolkit';
import { AppSurface, AttentionSigilButton } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { DropdownMenu, Icon, ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Mosaic, type MosaicEventHandler, type MosaicTileProps } from '@dxos/react-ui-mosaic';

import { meta } from '#meta';

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

type StackContextType = StackContextValue & {
  /** Container id used to scope Mosaic drag/drop. */
  id: string;
  eventHandler: MosaicEventHandler;
  /** Scroll viewport element; threaded to the Mosaic container for autoscroll. */
  viewport: HTMLElement | null;
  setViewport: (element: HTMLElement | null) => void;
};

const StackContext = createContext<StackContextType | undefined>(undefined);

const useStackContext = (consumer: string): StackContextType => {
  const context = useContext(StackContext);
  if (!context) {
    throw new Error(`\`${consumer}\` must be used within \`Stack.Root\`.`);
  }
  return context;
};

/** Section-level callbacks consumed by stack sections. */
export const useStack = (): StackContextValue => useStackContext('useStack');

//
// Root
//

type StackRootProps = PropsWithChildren<
  StackContextValue & {
    /** Container id used to scope Mosaic drag/drop. */
    id: string;
    /** Drag/drop event handler; defaults to a read-only (no-drop) handler. */
    eventHandler?: MosaicEventHandler;
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

  return (
    <StackContext.Provider value={value}>
      <Mosaic.Root>{children}</Mosaic.Root>
    </StackContext.Provider>
  );
};

StackRoot.displayName = 'Stack.Root';

//
// Content
//

type StackContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const StackContent = forwardRef<HTMLDivElement, StackContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { eventHandler, viewport } = useStackContext('Stack.Content');
    return (
      <Mosaic.Container asChild orientation='vertical' autoScroll={viewport} eventHandler={eventHandler}>
        <ScrollArea.Root {...props} orientation='vertical' classNames={classNames} ref={forwardedRef}>
          {children}
        </ScrollArea.Root>
      </Mosaic.Container>
    );
  },
);

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
const StackSection = ({ data, ...tileProps }: StackSectionProps) => {
  const { id, object } = data;
  const { t } = useTranslation(meta.profile.key);
  const { attendableId: parentAttendableId, collapsed, onAdd, onMoveUp, onMoveDown, onCollapse, onDelete } = useStack();
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const attendableId = Paths.getCollectionObjectPath(parentAttendableId, object.id);
  const attentionAttrs = useAttentionAttributes(attendableId);
  const surfaceData = useMemo(() => ({ attendableId, subject: object }), [object, attendableId]);
  const isCollapsed = collapsed.has(id);
  const icon = Obj.getIcon(object)?.icon ?? 'ph--circle-dashed--regular';
  const title = Obj.getLabel(object, { fallback: 'typename' }) ?? t('untitled-section.title');

  const rail = (
    <div className='grid grid-rows-[min-content_1fr] gap-2'>
      <DropdownMenu.Root open={optionsMenuOpen} onOpenChange={setOptionsMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <AttentionSigilButton size='md' attendableId={attendableId}>
            <Icon icon={icon} classNames='transition-opacity' />
          </AttentionSigilButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              {isCollapsed ? (
                <DropdownMenu.Item onClick={() => onCollapse(id, false)} data-testid='section.expand'>
                  <Icon icon='ph--arrows-out-line-vertical--regular' />
                  <span className='ms-2 grow'>{t('expand.label')}</span>
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item onClick={() => onCollapse(id, true)} data-testid='section.collapse'>
                  <Icon icon='ph--arrows-in-line-vertical--regular' />
                  <span className='ms-2 grow'>{t('collapse.label')}</span>
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator />
              <DropdownMenu.Item onClick={() => onAdd(id)} data-testid='section.add'>
                <Icon icon='ph--plus--regular' />
                <span className='ms-2 grow'>{t('add-section.label')}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onMoveUp(id)} data-testid='section.move-up'>
                <Icon icon='ph--arrow-line-up--regular' />
                <span className='ms-2 grow'>{t('move-up.label')}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onMoveDown(id)} data-testid='section.move-down'>
                <Icon icon='ph--arrow-line-down--regular' />
                <span className='ms-2 grow'>{t('move-down.label')}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onClick={() => onDelete(id)} data-testid='section.remove'>
                <Icon icon='ph--trash--regular' />
                <span className='ms-2 grow'>{t('remove-section.label')}</span>
              </DropdownMenu.Item>
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Mosaic.DragHandle
        label={t('drag-handle.label')}
        classNames='p-1 min-h-0 w-(--dx-rail-item) h-(--dx-rail-item)'
        testId='section.drag-handle'
      />
    </div>
  );

  return (
    <Mosaic.Tile
      {...tileProps}
      data={data}
      classNames='grid grid-cols-[var(--dx-rail-action)_1fr] dx-attention-surface border border-subdued-separator'
    >
      <div className='border-e border-subdued-separator'>
        <div className='sticky top-0 flex flex-col items-center p-1'>{rail}</div>
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

export type { StackRootProps, StackContentProps, StackViewportProps, StackSectionProps };
