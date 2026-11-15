//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';
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
  getBootFrame,
  getBootLook,
  getLastDrawing,
  getLastSpace,
  parseRoute,
  setBootFrame,
} from '../model/index.ts';
import { JoinShell } from './JoinShell.tsx';
import { DiagramTrigger, PillFrame, PillSeparator, ShareButton, SpaceTrigger } from './Pill.tsx';

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

// The scene's layers hold no controls, so whatever holds one is the frame.
const SCENE = '[data-testid="scene-view"]';
const MAX_FRAME = 256 * 1024;

// A new build may style the frame's classes differently, so a frame is only drawn with the stylesheet it came from.
const stylesheet = () => document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')?.href ?? '';

/** Saves the diagram's frame as drawn in `element`, for the next load to draw before its content. */
export const saveBootFrame = (drawingId: string, element: HTMLElement) => {
  if (!element.querySelector(`${SCENE} button`)) {
    return;
  }
  const frame = element.cloneNode(true) as HTMLElement;
  frame.querySelectorAll(`${SCENE} > *`).forEach((layer) => !layer.querySelector('button') && layer.remove());
  // The copy must not answer the live diagram's ids, test ids included.
  for (const node of [frame, ...frame.querySelectorAll('*')]) {
    ['id', 'data-testid', 'aria-controls', 'aria-describedby', 'aria-labelledby'].forEach((name) =>
      node.removeAttribute(name),
    );
  }
  const html = frame.outerHTML;
  if (html.length <= MAX_FRAME) {
    setBootFrame({ drawingId, stylesheet: stylesheet(), html });
  }
};

/** Whether `element` shows the live diagram's frame, or the error a surface shows in its place. */
export const isFrameShown = (element: HTMLElement): boolean =>
  (element.querySelector(`${SCENE} button`)?.getClientRects().length ?? 0) > 0 ||
  element.querySelector('[role="alert"]') !== null;

const expectedFrame = (look: BootLook): string | undefined => {
  const frame = getBootFrame();
  return frame && frame.drawingId === look.drawingId && frame.stylesheet === stylesheet() ? frame.html : undefined;
};

// The overlay takes the clicks meant for the app beneath it, and sits under dialogs and toasts so a live one shows over
// it; its content is inert, so it neither focuses nor reads out.
const BootShell = ({ look, frame }: { look: BootLook; frame?: string }) => (
  <Layout.Container
    classNames='fixed inset-0 z-[calc(var(--dx-layer-toast)-1)] bg-base-surface'
    data-testid='diagram-app.boot-shell'
  >
    <div inert className='contents'>
      {frame && <div className='dx-cover flex flex-col' dangerouslySetInnerHTML={{ __html: frame }} />}
      <PillFrame testId='diagram-app.boot-pill'>
        <SpaceTrigger name={look.spaceName} hue={Avatar.toAvatarHue(look.spaceHue)} />
        <PillSeparator />
        <DiagramTrigger name={look.drawingName ?? '…'} />
        <ShareButton />
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
 * Draws the expected pill and diagram frame at once, ahead of the client and plugins; the live app replaces them. An
 * invitation link draws the join dialog over them, so closing it leaves the shell already in place.
 */
export const showBootShell = () => {
  document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  const look = expectedLook();
  shell = mount(<BootShell look={look} frame={expectedFrame(look)} />);
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
