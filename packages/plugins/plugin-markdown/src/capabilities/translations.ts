//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';

import { translations } from '#translations';

/**
 * Contributes the plugin's translations, plus the editor's — the markdown surface is a CodeMirror
 * editor, so its strings are only needed where markdown is. A file rather than an inline list
 * because the descriptor names modules by file, which also defers the bundles to their own chunk.
 */
export default () =>
  Effect.succeed([Capability.contribute(AppCapabilities.Translations, [...translations, ...editorTranslations])]);
