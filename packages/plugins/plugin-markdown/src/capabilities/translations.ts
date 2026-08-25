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
 * editor, so its strings are only ever needed where markdown is.
 *
 * A module file rather than an inline list on the entrypoint: the descriptor names modules by
 * file, and the resource bundles are a chunk's worth of strings that no longer have to be resident
 * before the plugin activates.
 */
export default () =>
  Effect.succeed([Capability.contribute(AppCapabilities.Translations, [...translations, ...editorTranslations])]);
