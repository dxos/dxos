//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as PresenterSurface from '@dxos/plugin-presenter/PresenterSurface';

import {
  PresentationRecordingsArticle,
  RecordButton,
  RecorderSettings,
  RecordingOverlay,
  SlideRecordingsArticle,
} from '#containers';
import { meta } from '#meta';

import { RECORDINGS_COMPANION } from '../constants.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'recordButton',
        filter: Surface.makeFilter(PresenterSurface.Toolbar, () => true),
        component: RecordButton,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'recordingOverlay',
        filter: Surface.makeFilter(PresenterSurface.Overlay, () => true),
        component: RecordingOverlay,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'presentationRecordings',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, RECORDINGS_COMPANION),
          AppSurface.companion(AppSurface.Article, Presentation.Presentation),
        ),
        component: PresentationRecordingsArticle,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, attendableId, presentation: companionTo }),
      }),
      Surface.create({
        id: 'slideRecordings',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, RECORDINGS_COMPANION),
          AppSurface.companion(AppSurface.Article, Presentation.Slide),
        ),
        component: SlideRecordingsArticle,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, attendableId, slide: companionTo }),
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: RecorderSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
