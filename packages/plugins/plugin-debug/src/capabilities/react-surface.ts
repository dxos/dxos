//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { type IdbLogStore } from '@dxos/log-store-idb';
import * as Position from '@dxos/util/Position';

import { DebugPanelDrawer, DebugPanelStatus, DebugStatus, LoggerPanel, StatsPanel, Wireframe } from '#containers';
import { meta } from '#meta';
import { DebugNodes, DebugSurface } from '#types';

import { DebugCapabilities } from '../types/Debug.ts';
import {
  DebugConsoleArticle,
  DebugSettingsSurface,
  ObjectDebugSurface,
  SpaceGeneratorSurface,
  SpaceObjectsSurface,
} from './DebugSurfaces.tsx';

type ReactSurfaceOptions = {
  logStore?: IdbLogStore;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ logStore }: ReactSurfaceOptions) {
    const registry = yield* Capabilities.AtomRegistry;
    const settingsAtom = yield* DebugCapabilities.Settings;
    const fileUploader = (yield* Capability.getAll(AppCapabilities.FileUploader))[0];

    return Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: DebugSettingsSurface,
        props: ({ data: { subject } }) => ({ subject, logStore, onUpload: fileUploader }),
      }),
      Surface.Root.create({
        id: 'space',
        filter: AppSurface.literal(DebugSurface.Page, DebugNodes.SpaceType),
        component: SpaceGeneratorSurface,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'wireframe',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.subject(AppSurface.Article, (value): value is Obj.Unknown => {
            const settings = registry.get(settingsAtom);
            return Obj.isObject(value) && !!settings.wireframe;
          }),
          AppSurface.subject(AppSurface.Section, (value): value is Obj.Unknown => {
            const settings = registry.get(settingsAtom);
            return Obj.isObject(value) && !!settings.wireframe;
          }),
        ),
        position: Position.first,
        component: Wireframe,
        props: ({ role, name, data: { subject } }) => ({
          label: `${role}:${name}`,
          object: subject,
          classNames: 'row-span-2 overflow-hidden',
        }),
      }),
      Surface.Root.create({
        id: 'console',
        filter: AppSurface.literal(DebugSurface.Page, DebugNodes.Console),
        component: DebugConsoleArticle,
      }),
      Surface.Root.create({
        id: 'logsArticle',
        filter: AppSurface.literal(DebugSurface.Page, DebugNodes.Logs),
        component: LoggerPanel,
      }),
      Surface.Root.create({
        id: 'objectDebug',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'debug'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ObjectDebugSurface,
        props: ({ role, data: { companionTo } }) => ({ role, companionTo }),
      }),
      Surface.Root.create({
        id: 'spaceObjects',
        filter: Surface.Root.makeFilter(AppSurface.deckCompanion('spaceObjects')),
        component: SpaceObjectsSurface,
      }),
      Surface.Root.create({
        id: 'debugStatus',
        filter: Surface.Root.makeFilter(AppSurface.StatusIndicator),
        position: Position.first,
        component: DebugStatus,
      }),
      Surface.Root.create({
        id: 'debugPanelStatus',
        filter: Surface.Root.makeFilter(AppSurface.StatusIndicator),
        component: DebugPanelStatus,
      }),
      Surface.Root.create({
        id: 'debugDrawer',
        filter: Surface.Root.makeFilter(AppSurface.Drawer),
        component: DebugPanelDrawer,
      }),
      Surface.Root.create({
        id: 'statsPanel',
        filter: Surface.Root.makeFilter(DebugSurface.Stats),
        component: StatsPanel,
      }),
      Surface.Root.create({
        id: 'statsCards',
        filter: Surface.Root.makeFilter(AppSurface.DevtoolsOverview),
        // After the devtools cards (0–12) and before contributors that sit last.
        position: 20,
        component: StatsPanel,
        props: () => ({ showEmpty: false }),
      }),
    ]);
  }),
);
