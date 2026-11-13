//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React, { useEffect, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything else.
import '@dxos/node-std/globals';
import '@dxos/react-ui/theme.css';
import * as StoryEmbed from '@dxos/storybook-testing/StoryEmbed';

import { useNearViewport, useThemeMode } from './hooks.ts';

type ApiStoryEntry = {
  load: () => Promise<StoryEmbed.Module>;
  name: string;
  /** Args over the story's own, such as turning off its debug panel. */
  args?: Record<string, unknown>;
};

/** The story at the top of each component namespace page, and on its TILE Overview card, by `<package>/<namespace>` [D-294, D-295]. */
const STORIES: Record<string, ApiStoryEntry> = {
  'react-ui-calendar/calendar': {
    load: () => import('../../../packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx'),
    name: 'Week',
  },
  'react-ui-diagram/diagram': {
    load: () => import('../../../packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx'),
    name: 'Docs',
  },
  'react-ui-editor/editor': {
    load: () => import('../../../packages/ui/react-ui-editor/src/components/Editor/Editor.stories.tsx'),
    name: 'WithToolbar',
  },
  'react-ui-form/form': {
    load: () => import('../../../packages/ui/react-ui-form/src/components/Form.stories.tsx'),
    name: 'Default',
  },
  'react-ui-geo/globe': {
    load: () => import('../../../packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx'),
    name: 'Docs',
  },
  'react-ui-geo/map': {
    load: () => import('../../../packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx'),
    name: 'Markers',
  },
  'react-ui-graph/graph': {
    load: () => import('../../../packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx'),
    name: 'Docs',
  },
  'react-ui-graph/svg': {
    load: () => import('../../../packages/ui/react-ui-graph/src/components/SVG/SVG.stories.tsx'),
    name: 'Default',
  },
  'react-ui-grid/grid': {
    load: () => import('../../../packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx'),
    name: 'Docs',
  },
  'react-ui-list/listbox': {
    load: () => import('../../../packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx'),
    name: 'Default',
  },
  'react-ui-list/ordered-list': {
    load: () => import('../../../packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx'),
    name: 'Default',
  },
  'react-ui-list/picker': {
    load: () => import('../../../packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx'),
    name: 'Default',
  },
  'react-ui-list/tree': {
    load: () => import('../../../packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx'),
    name: 'Default',
  },
  'react-ui-masonry/masonry': {
    load: () => import('../../../packages/ui/react-ui-masonry/src/Masonry.stories.tsx'),
    name: 'Docs',
  },
  'react-ui-menu/action-menu': {
    load: () => import('../../../packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx'),
    name: 'StaticItems',
  },
  'react-ui-menu/action-toolbar': {
    load: () => import('../../../packages/ui/react-ui-menu/src/components/ActionToolbar.stories.tsx'),
    name: 'Default',
  },
  'react-ui-mosaic/board': {
    load: () => import('../../../packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx'),
    name: 'Default',
  },
  'react-ui-mosaic/mosaic': {
    load: () => import('../../../packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx'),
    name: 'DefaultDraggable',
  },
  'react-ui-plot/plot': {
    load: () => import('../../../packages/ui/react-ui-plot/src/components/Plot/Plot.stories.tsx'),
    name: 'Docs',
  },
  'react-ui-plot/timeline': {
    load: () => import('../../../packages/ui/react-ui-plot/src/components/Timeline/Timeline.stories.tsx'),
    name: 'Default',
  },
};

export type ApiStoryProps = {
  id: string;
};

/** A package's own story, live, in the page's theme: `<ApiStory id='react-ui-mosaic/board' client:only='react' />`. */
export const ApiStory = ({ id }: ApiStoryProps) => {
  const entry = STORIES[id];
  if (!entry) {
    throw new Error(`No API story "${id}"`);
  }

  const themeMode = useThemeMode();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const near = useNearViewport(element, true);
  const [story, setStory] = useState<StoryEmbed.Composed>();
  const [error, setError] = useState<string>();
  // The story's decorators read the theme as a global, so a theme change composes it again.
  useEffect(() => {
    if (!near) {
      return;
    }
    let cancelled = false;
    entry
      .load()
      .then((module) => StoryEmbed.compose(module, entry.name, { theme: themeMode }))
      // A composed story is a function, which `setStory` would call as an updater.
      .then(
        (composed) => !cancelled && setStory(() => composed),
        (error) => !cancelled && setError(String(error)),
      );
    return () => {
      cancelled = true;
    };
  }, [entry, near, themeMode]);

  return (
    <div ref={setElement} className='h-full'>
      {error ? (
        <p role='alert'>{error}</p>
      ) : (
        story && <StoryEmbed.Root key={themeMode} story={story} args={entry.args} classNames='h-full' />
      )}
    </div>
  );
};
