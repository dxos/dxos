//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.presenter'),
  name: 'Presenter',
  author: 'DXOS',
  description: trim`
    Transform existing workspace objects into interactive presentation slideshows without
    duplicating content. Markdown documents are split into slides on horizontal \`---\`
    separators and rendered with Reveal.js, giving authors a familiar authoring surface
    with full Markdown syntax. Collections can optionally be presented slide-by-slide,
    with each member object rendered by its own plugin surface.

    Activate presentation mode for any supported object via the action menu or the
    Shift+Cmd+P (macOS) / Shift+Alt+P (Windows/Linux) keyboard shortcut. The presenter
    opens in a solo fullscreen layout managed by the Deck plugin, keeping the rest of the
    workspace undisturbed.

    Navigation controls and a page-number indicator are shown during collection
    slideshows. Pressing Escape exits fullscreen and returns to the originating document
    or collection view. All navigation is keyboard-accessible.

    Collaboration is inherent: because slides are backed by live ECHO objects, edits made
    by any peer in the workspace are immediately reflected in an open presentation without
    any manual refresh.
  `,
  icon: 'ph--presentation--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-presenter',
  spec: 'PLUGIN.mdl',
});
