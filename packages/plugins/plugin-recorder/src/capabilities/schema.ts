//
// Copyright 2026 DXOS.org
//

import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';
import * as Variant from '@dxos/plugin-studio/Variant';

import { Recording } from '#types';

/** Schemas this plugin registers, loaded on demand; the take artifacts work without plugin-studio enabled. */
export default [Recording.Recording, MediaArtifact.MediaArtifact, Variant.Variant];
