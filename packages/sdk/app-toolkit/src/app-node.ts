//
// Copyright 2025 DXOS.org
//

import { type Node } from '@dxos/app-graph';
import { type Space } from '@dxos/client/echo';
import { type Position } from '@dxos/util';

import { DECK_COMPANION_TYPE, PLANK_COMPANION_TYPE } from './companion-types';
import { NOT_FOUND_NODE_ID, NOT_FOUND_NODE_TYPE } from './not-found';
import { createObjectNode } from './object-node';
import { type Label } from './translations';

//
// Re-export createObjectNode as makeObject.
//

/** Build an app-graph node for an ECHO object. Alias for `createObjectNode`. */
export const makeObject: typeof createObjectNode = createObjectNode;

//
// Companion helpers.
//

export type MakeCompanionProps<TData = string> = {
  id: string;
  label: Label;
  icon: string;
  data: TData;
  position?: Position;
  joyride?: string;
};

/** Build a plank-level companion panel node. */
export const makeCompanion = <TData = string>({
  id,
  label,
  icon,
  data,
  position,
}: MakeCompanionProps<TData>): Node.NodeArg<TData> => ({
  id,
  type: PLANK_COMPANION_TYPE,
  data,
  properties: {
    label,
    icon,
    disposition: 'hidden',
    ...(position !== undefined && { position }),
  },
});

/** Build a deck-level (workspace-wide) companion panel node. */
export const makeDeckCompanion = <TData = any>({
  id,
  label,
  icon,
  data,
  position,
  joyride,
}: MakeCompanionProps<TData>): Node.NodeArg<TData> => ({
  id,
  type: DECK_COMPANION_TYPE,
  data,
  properties: {
    label,
    icon,
    disposition: 'hidden',
    ...(position !== undefined && { position }),
    ...(joyride !== undefined && { joyride }),
  },
});

//
// Section helpers.
//

export type MakeSectionProps = {
  id: string;
  type: string;
  label: Label;
  icon: string;
  iconHue?: string;
  space: Space;
  position?: Position;
  testId?: string;
};

/** Build a virtual branch node for a space section (types, collections, mailboxes, etc.). */
export const makeSection = ({
  id,
  type,
  label,
  icon,
  iconHue = 'neutral',
  space,
  position,
  testId,
}: MakeSectionProps): Node.NodeArg<null> => ({
  id,
  type,
  data: null,
  properties: {
    label,
    icon,
    iconHue,
    role: 'branch',
    draggable: false,
    droppable: false,
    space,
    ...(position !== undefined && { position }),
    ...(testId !== undefined && { testId }),
  },
});

//
// Settings helpers.
//

export type MakeSettingsPanelProps = {
  id: string;
  type: string;
  label: Label;
  icon: string;
  iconHue?: string;
  position?: Position;
};

export const makeSettingsPanel = ({
  id,
  type,
  label,
  icon,
  iconHue,
  position,
}: MakeSettingsPanelProps): Node.NodeArg<string> => ({
  id,
  type,
  data: type,
  properties: {
    label,
    icon,
    ...(iconHue !== undefined && { iconHue }),
    ...(position !== undefined && { position }),
  },
});

//
// Not-found helpers.
//

/** Build the not-found sentinel node. */
export const makeNotFound = (): Node.NodeArg<null> => ({
  id: NOT_FOUND_NODE_ID,
  type: NOT_FOUND_NODE_TYPE,
  data: null,
  properties: {
    label: ['not-found.heading', { ns: 'org.dxos.i18n.os' }],
    icon: 'ph--warning--regular',
    disposition: 'hidden',
  },
});
