//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.crx'),
  name: 'CRX',
  author: 'DXOS',
  description: trim`
    CRX is the Composer side of the composer-crx browser extension bridge. The
    extension lets users pick any DOM subtree on any web page and send it to
    Composer as a typed clip. plugin-crx registers a window event listener for
    the composer:clip CustomEvent, validates and decodes the clip envelope, maps
    it to an ECHO object in the active space, and dispatches a composer:clip:ack
    acknowledgement back to the extension with the outcome. The extension
    discovers the Composer tab via chrome.tabs.query; the plugin owns all
    Composer-side logic including envelope validation, object mapping, and user
    feedback.

    Three clip kinds are supported. A person clip creates a Person object with
    fullName populated from page heuristics (h1 heading, og:title, or the first
    line of the selection), an image from og:image, the picked text as notes,
    and the page URL as a link. An organization clip creates an Organization
    with name from og:title or h1, description from og:description, and the
    page URL as website. A note clip creates a Markdown document with a small
    prelude (title, source link, timestamp) followed by the rendered selection
    text. All mappings are best-effort: missing fields are left unset rather
    than blocking creation.

    Envelope validation runs a version check (only version 1 is accepted) and
    full schema decoding before any object is created. Invalid payloads,
    unsupported versions, and unknown kinds each return a distinct stable error
    code in the ack event so the extension can surface a precise error message
    to the user. If the active space cannot be resolved no object is created and
    the ack carries a noSpace error.

    The settings surface contributes two toggles: an enabled master switch that
    prevents the bridge from processing any clips when off, and an
    autoOpenAfterClip option that navigates Composer to the newly created object
    after a successful clip. Settings are persisted to the app-framework
    settings store and available to other plugins via a plugin-scoped capability.
  `,
  icon: 'ph--browser--regular',
  iconHue: 'neutral',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crx',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['system'],
};
