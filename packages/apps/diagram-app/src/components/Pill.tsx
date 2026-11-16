//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type PropsWithChildren, type ReactNode, createContext, useContext, useRef } from 'react';

import { Annotation, Type } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import { mx } from '@dxos/ui-theme';

// The pill's parts are shared by the live pill and the boot shell, so the shell is drawn exactly where the pill lands.

/** The `Drawing` type's own icon, as Composer shows it. */
export const DIAGRAM_ICON = Annotation.IconAnnotation.get(Type.getSchema(Drawing.Drawing)).pipe(
  Option.map(({ icon }) => icon),
  Option.getOrElse(() => 'ph--compass-tool--regular'),
);

const getAccentWash = (accent: string) => `color-mix(in oklab, var(--color-${accent}-border) 18%, transparent)`;

export type PillFrameProps = PropsWithChildren<{
  testId: string;
  /** A palette hue the pill washes in, with a one-pixel underline, as Composer's plank headings do during a follow. */
  accent?: string;
}>;

/**
 * The pill's frame in the top edge, between the breadcrumbs and the inspector, which the canvas article's toolbars
 * leave free. It centres in the page while both sides have room, then moves aside, then shrinks.
 */
export const PillFrame = ({ children, testId, accent }: PillFrameProps) => (
  <div role='none' className='absolute top-2 inset-x-2 z-30 flex pointer-events-none'>
    <div role='none' className='flex-1 basis-0 min-w-24' />
    <Layout.Flex
      align='center'
      classNames='min-w-0 pointer-events-auto rounded-sm bg-modal-surface border border-separator p-0.5'
      style={
        accent
          ? {
              backgroundImage: `linear-gradient(${getAccentWash(accent)}, ${getAccentWash(accent)})`,
              boxShadow: `inset 0 -1px 0 var(--color-${accent}-border)`,
            }
          : undefined
      }
      data-accent={accent}
      data-testid={testId}
    >
      {children}
    </Layout.Flex>
    {/* The floating inspector's width (`w-80`) and the gap to it; below 800 px the editor folds it to one icon. */}
    <div role='none' className='flex-1 basis-0 min-w-82 max-[800px]:min-w-10' />
  </div>
);

/** A combobox trigger (`asChild`) passes its own `className` to the trigger, beside the Button's props. */
type TriggerProps = Button.RootProps & { name: string; className?: string };

export type SpaceTriggerProps = TriggerProps & { hue: Avatar.RootProps['hue'] };

// A long name truncates; a pill too narrow for the names shows the avatar or icon alone (`PillToolbar`).
const NAME = '[&>span]:truncate';

/** Whether the pill's toolbar has collapsed the trigger to its glyph. */
const CollapsedContext = createContext(false);

export const SpaceTrigger = ({ name, hue, className, ...props }: SpaceTriggerProps) => {
  const collapsed = useContext(CollapsedContext);
  return (
    <Button.Root
      variant='ghost'
      caretDown
      aria-label={collapsed ? name : undefined}
      {...props}
      classNames={mx(NAME, 'max-w-60 ps-1.25', className)}
    >
      <Avatar.Root variant='square' size='xs' hue={hue} fallback={name} />
      {!collapsed && <span>{name}</span>}
    </Button.Root>
  );
};

export const DiagramTrigger = ({ name, className, ...props }: TriggerProps) => {
  const collapsed = useContext(CollapsedContext);
  return (
    <Button.Root
      variant='ghost'
      caretDown
      icon={DIAGRAM_ICON}
      aria-label={collapsed ? name : undefined}
      {...props}
      classNames={mx(NAME, 'max-w-72', className)}
    >
      {!collapsed && <span>{name}</span>}
    </Button.Root>
  );
};

type PillSlots = {
  space: ReactNode;
  diagram: ReactNode;
  presence?: ReactNode;
};

const PillSlotsContext = createContext<PillSlots>({ space: null, diagram: null });

// The toolbar's items render these, so the menus update without rebuilding the toolbar's items.
const PillSlot = ({ name, collapsed = false }: { name: keyof PillSlots; collapsed?: boolean }) => (
  <CollapsedContext.Provider value={collapsed}>{useContext(PillSlotsContext)[name]}</CollapsedContext.Provider>
);

export type PillToolbarProps = PillSlots & {
  onShare?: () => void;
};

/**
 * The pill's controls as a toolbar: the space and diagram menus, Share and the viewers. As it narrows, Share, then the
 * space menu, then the diagram menu show their glyph alone; the viewers never collapse.
 */
export const PillToolbar = ({ onShare, ...slots }: PillToolbarProps) => {
  const shareRef = useRef(onShare);
  shareRef.current = onShare;
  const viewers = slots.presence !== undefined;
  const menu = useMenuBuilder(() => {
    const builder = MenuBuilder.make()
      .root({ label: 'Diagram' })
      .custom('space', { label: 'Space', placement: { collapse: 2 } }, ({ collapsed }) => (
        <PillSlot name='space' collapsed={collapsed} />
      ))
      .separator('line')
      .custom('diagram', { label: 'Diagram', placement: { collapse: 1 } }, ({ collapsed }) => (
        <PillSlot name='diagram' collapsed={collapsed} />
      ))
      .action(
        'share',
        {
          label: 'Share',
          icon: 'ph--user-plus--regular',
          variant: 'primary',
          iconOnly: false,
          testId: 'diagram-app.share',
          placement: { collapse: 3 },
        },
        () => shareRef.current?.(),
      );
    if (viewers) {
      // Empty while no one else is here, so Share ends the row.
      builder.custom('presence', { label: 'Viewers' }, () => (
        <Layout.Flex classNames='mx-(--dx-control-inset) ps-(--dx-gap-size) empty:hidden'>
          <PillSlot name='presence' />
        </Layout.Flex>
      ));
    }
    return builder.build();
  }, [viewers]);
  return (
    <PillSlotsContext.Provider value={slots}>
      {/* The space avatar at the start, and Share or a viewer at the end, sit twice the pill's top padding from its edge. */}
      <ActionToolbar {...menu} alwaysActive classNames='min-w-0 bg-transparent ps-0 pe-1.25' />
    </PillSlotsContext.Provider>
  );
};
