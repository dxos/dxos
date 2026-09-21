//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Frame, Lightbox, MediaArtifact, Storyboard, Variant } from '#types';

export const Schema = AppCapability.schema([
  MediaArtifact.MediaArtifact,
  Variant.Variant,
  Lightbox.Lightbox,
  Storyboard.Storyboard,
  Frame.Frame,
]);
