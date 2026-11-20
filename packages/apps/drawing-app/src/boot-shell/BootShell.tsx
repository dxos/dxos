//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, Suspense, lazy, useRef, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Layout from '@dxos/react-ui/Layout';
import * as Theme from '@dxos/react-ui/Theme';
import * as Typography from '@dxos/react-ui/Typography';

import {
  type BootLook,
  DiagramTrigger,
  FIRST_SPACE_NAME,
  INVITATION_PARAM,
  PillFrame,
  PillToolbar,
  SHELL_PART_ATTRIBUTE,
  type ShellPart,
  SpaceTrigger,
  UNTITLED,
  getBootLook,
  getLastDrawing,
  getLastSpace,
  getShellParts,
  parseRoute,
  showShell,
  subscribeShell,
} from '../shared/index.ts';

const isInvitation = () => new URL(window.location.href).searchParams.has(INVITATION_PARAM);

/**
 * The pill the app is about to show, from what it last showed: the space and diagram startup will open. A first run
 * opens a new "My diagrams" with one untitled diagram; a space the last visit did not show has no names yet.
 */
const expectedLook = (): BootLook => {
  const route = parseRoute(window.location.pathname);
  const spaceId = route.spaceId ?? getLastSpace();
  if (!spaceId) {
    return { spaceId: '', spaceName: FIRST_SPACE_NAME, drawingName: UNTITLED };
  }
  const look = getBootLook();
  if (look?.spaceId !== spaceId) {
    return { spaceId, spaceName: '…' };
  }
  const drawingId = route.drawingId ?? getLastDrawing(spaceId);
  return drawingId === look.drawingId ? look : { ...look, drawingId, drawingName: undefined };
};

// The canvas editor loads with the canvas plugin, after first paint; the shell draws it as soon as it arrives.
const CanvasFrame = lazy(() =>
  import('@dxos/plugin-canvas/CanvasFrame').then(({ CanvasFrame }) => ({ default: CanvasFrame })),
);

// The layout takes the clicks meant for the app beneath it, and sits under dialogs and toasts so a live one shows over
// it; its content is inert, so it neither focuses nor reads out.
const LayoutPart = ({ look }: { look: BootLook }) => (
  <Layout.Container
    classNames='fixed inset-0 z-[calc(var(--dx-layer-toast)-1)] bg-base-surface'
    data-testid='diagram-app.boot-shell'
  >
    <div inert className='contents'>
      <div className='dx-cover grid'>
        <Suspense>
          <CanvasFrame />
        </Suspense>
      </div>
      <PillFrame testId='diagram-app.boot-pill'>
        <PillToolbar
          space={<SpaceTrigger name={look.spaceName} hue={Avatar.toAvatarHue(look.spaceHue)} />}
          diagram={<DiagramTrigger name={look.drawingName ?? '…'} />}
        />
      </PillFrame>
    </div>
  </Layout.Container>
);

/** A still copy of Composer's join dialog as it connects, which takes no input. */
const JoinPart = () => {
  const container = useRef<HTMLDivElement>(null);
  return (
    <div inert ref={container} className='contents' data-testid='diagram-app.join-shell'>
      <Dialog.Root open modal={false}>
        <Dialog.Content container={container}>
          <Dialog.Header>
            <Dialog.Title>Joining space</Dialog.Title>
            <Button.Root variant='ghost' icon='ph--x--regular' iconOnly label='Exit' />
          </Dialog.Header>
          <Dialog.Body>
            <Typography.Text tone='muted'>Connecting…</Typography.Text>
          </Dialog.Body>
          <Dialog.Footer>
            <Button.Root variant='ghost'>Cancel</Button.Root>
            <Button.Root variant='primary' disabled>
              Next
            </Button.Root>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};

const Part = ({ part, children }: { part: ShellPart; children: ReactNode }) => (
  <div role='none' className='contents' {...{ [SHELL_PART_ATTRIBUTE]: part }}>
    {children}
  </div>
);

/** Whichever of the shell's parts are on; the join dialog draws over the layout. */
const BootShell = ({ look }: { look: BootLook }) => {
  const parts = useSyncExternalStore(subscribeShell, getShellParts);
  return (
    <>
      {parts.layout && (
        <Part part='layout'>
          <LayoutPart look={look} />
        </Part>
      )}
      {parts.join && (
        <Part part='join'>
          <JoinPart />
        </Part>
      )}
    </>
  );
};

const themed = (node: ReactNode) => {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={dark ? 'dark' : 'light'}>
      {node}
    </Theme.Provider>
  );
};

let shown = false;

/**
 * Draws the expected pill at once and the diagram's frame as soon as the canvas editor loads, ahead of the client and
 * plugins, with the join dialog over them for an invitation link; the live app replaces each part. The shell stays
 * mounted, so the layout plugin can show the join part again after a join.
 */
export const showBootShell = () => {
  if (shown) {
    return;
  }
  shown = true;
  document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  const container = document.body.appendChild(document.createElement('div'));
  // A dismissal usually comes from a layout effect in the live app, where this root cannot render synchronously; the
  // part is hidden at once, so it leaves in the frame its replacement commits, and React removes it after.
  subscribeShell((parts) => {
    container.querySelectorAll<HTMLElement>(`[${SHELL_PART_ATTRIBUTE}]`).forEach((element) => {
      element.style.display = parts[element.getAttribute(SHELL_PART_ATTRIBUTE) as ShellPart] ? '' : 'none';
    });
  });
  showShell('layout', ...(isInvitation() ? (['join'] as const) : []));
  const root = createRoot(container);
  // Rendered at once, so the first paint has the shell, and the join dialog over it.
  flushSync(() => root.render(themed(<BootShell look={expectedLook()} />)));
};
