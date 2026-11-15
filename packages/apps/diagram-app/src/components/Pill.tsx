//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type PropsWithChildren } from 'react';

import { Annotation, Type } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

// The pill's parts are shared by the live pill and the boot shell, so the shell is drawn exactly where the pill lands.

/** The `Drawing` type's own icon, as Composer shows it. */
export const DIAGRAM_ICON = Annotation.IconAnnotation.get(Type.getSchema(Drawing.Drawing)).pipe(
  Option.map(({ icon }) => icon),
  Option.getOrElse(() => 'ph--compass-tool--regular'),
);

/** The pill's frame, centered in the top edge, which the canvas article's toolbars leave free. */
export const PillFrame = ({ children, testId }: PropsWithChildren<{ testId: string }>) => (
  <Layout.Flex
    gap='xs'
    align='center'
    classNames='absolute top-2 inset-x-0 mx-auto w-fit z-30 rounded-sm bg-modal-surface border border-separator p-0.5'
    data-testid={testId}
  >
    {children}
  </Layout.Flex>
);

export const PillSeparator = () => <Typography.Text classNames='text-fg-subtle'>/</Typography.Text>;

export type SpaceTriggerProps = Button.RootProps & { name: string; hue: Avatar.RootProps['hue'] };

export const SpaceTrigger = ({ name, hue, ...props }: SpaceTriggerProps) => (
  <Button.Root variant='ghost' caretDown {...props}>
    <Avatar.Root variant='square' size='xs' hue={hue} fallback={name} />
    {name}
  </Button.Root>
);

export const DiagramTrigger = ({ name, ...props }: Button.RootProps & { name: string }) => (
  <Button.Root variant='ghost' caretDown icon={DIAGRAM_ICON} {...props}>
    {name}
  </Button.Root>
);

export const ShareButton = (props: Button.RootProps) => (
  <Button.Root variant='primary' icon='ph--user-plus--regular' {...props}>
    Share
  </Button.Root>
);
