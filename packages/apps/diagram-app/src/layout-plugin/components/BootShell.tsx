//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, Suspense, lazy } from 'react';
import { flushSync } from 'react-dom';
import { type Root, createRoot } from 'react-dom/client';

import * as Avatar from '@dxos/react-ui/Avatar';
import * as Layout from '@dxos/react-ui/Layout';
import * as Theme from '@dxos/react-ui/Theme';

import {
  type BootLook,
  FIRST_SPACE_NAME,
  INVITATION_PARAM,
  UNTITLED,
  getBootLook,
  getLastDrawing,
  getLastSpace,
  parseRoute,
} from '../model/index.ts';
import { JoinShell } from './JoinShell.tsx';
import { DiagramTrigger, PillFrame, PillToolbar, SpaceTrigger } from './Pill.tsx';

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

/** Whether `element` shows the live diagram's frame, or the error a surface shows in its place. */
export const isFrameShown = (element: HTMLElement): boolean =>
  (element.querySelector('[data-testid="scene-view"] button')?.getClientRects().length ?? 0) > 0 ||
  element.querySelector('[role="alert"]') !== null;

// The overlay takes the clicks meant for the app beneath it, and sits under dialogs and toasts so a live one shows over
// it; its content is inert, so it neither focuses nor reads out.
const BootShell = ({ look }: { look: BootLook }) => (
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

type Overlay = { root: Root; container: HTMLElement };

let shell: Overlay | undefined;
let joinDialog: Overlay | undefined;

const themed = (node: ReactNode) => {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={dark ? 'dark' : 'light'}>
      {node}
    </Theme.Provider>
  );
};

const mount = (node: ReactNode): Overlay => {
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  // Rendered at once, so the shell and the join dialog over it reach the same first paint.
  flushSync(() => root.render(themed(node)));
  return { root, container };
};

// Removes an overlay in the frame the caller commits; unmounting a root synchronously from another root's commit is
// not allowed.
const unmount = ({ root, container }: Overlay) => {
  container.remove();
  queueMicrotask(() => root.unmount());
};

/**
 * Draws the expected pill at once and the diagram's frame as soon as the canvas editor loads, ahead of the client and
 * plugins; the live app replaces them. An invitation link draws the join dialog over them, so closing it leaves the
 * shell already in place.
 */
export const showBootShell = () => {
  document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  shell = mount(<BootShell look={expectedLook()} />);
  if (isInvitation()) {
    showJoinDialog();
  }
};

/** Removes the shell, and the join dialog over it; safe to call from a layout effect and more than once. */
export const dismissBootShell = () => {
  if (shell) {
    unmount(shell);
    shell = undefined;
  }
  dismissJoinDialog();
};

/** Whether the shell still covers the app. */
export const isBootShellShown = () => shell !== undefined;

/** Draws the still join dialog (`JoinShell`) over everything, while no live one is on screen. */
export const showJoinDialog = () => {
  joinDialog ??= mount(<JoinShell />);
};

/** Removes the still join dialog; safe to call more than once. */
export const dismissJoinDialog = () => {
  if (joinDialog) {
    unmount(joinDialog);
    joinDialog = undefined;
  }
};

/** Removes the still join dialog once a live dialog is on screen in its place. */
export const dismissJoinDialogOnDialog = (): (() => void) | undefined => {
  const shown = () =>
    [...document.querySelectorAll('[role="dialog"]')].some((dialog) => !joinDialog?.container.contains(dialog));
  if (!joinDialog) {
    return;
  }
  if (shown()) {
    dismissJoinDialog();
    return;
  }
  const observer = new MutationObserver(() => {
    if (shown()) {
      observer.disconnect();
      dismissJoinDialog();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
};
