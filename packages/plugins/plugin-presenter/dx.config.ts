//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.presenter',
    name: 'Presenter',
    author: 'DXOS',
    description: trim`
      Build slide decks from the objects in your workspace without duplicating content. A
      Presentation is an ordered list of sections, each a markdown slide written in place or a
      link to any other object, and appears in the navtree as a folder of slides that can be
      reordered by dragging. Objects without a dedicated slide surface still render as a title
      slide.

      Press F, or use the toolbar, to present a deck fullscreen on its own plank. Arrow keys
      step through slides, Escape exits fullscreen, and a pager overlay appears on pointer
      movement. Each viewer keeps their own place in a deck across reloads.

      Any markdown document can also be previewed as a deck from its Presenter companion, split
      into slides on horizontal \`---\` separators, and presented with Shift+Cmd+P (macOS) /
      Shift+Alt+P (Windows/Linux).

      Collaboration is inherent: because slides are backed by live ECHO objects, edits made
      by any peer in the workspace are immediately reflected in an open presentation without
      any manual refresh.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-presenter',
    icon: { key: 'ph--presentation--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['beta'],
  },
});
