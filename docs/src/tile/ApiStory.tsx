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

/** The story at the top of each component namespace page, and on its TILE Overview card, by `<package>/<namespace>` [D-296, D-297]. */
const STORIES: Record<string, ApiStoryEntry> = {
  'react-ui-calendar/calendar': {
    load: () => import('../../../packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx'),
    name: 'Week',
  },
  'react-ui-canvas-editor/canvas-editor': {
    load: () => import('../../../packages/ui/react-ui-canvas-editor/src/components/CanvasEditor/Canvas.stories.tsx'),
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
    name: 'Docs',
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
  'react-ui/accordion': {
    load: () => import('../../../packages/ui/react-ui/src/components/Accordion/Accordion.stories.tsx'),
    name: 'Default',
  },
  'react-ui/alert-dialog': {
    load: () => import('../../../packages/ui/react-ui/src/components/AlertDialog/AlertDialog.stories.tsx'),
    name: 'Default',
  },
  'react-ui/avatar': {
    load: () => import('../../../packages/ui/react-ui/src/components/Avatar/Avatar.stories.tsx'),
    name: 'Default',
  },
  'react-ui/badge': {
    load: () => import('../../../packages/ui/react-ui/src/components/Badge/Badge.stories.tsx'),
    name: 'Default',
  },
  'react-ui/banner': {
    load: () => import('../../../packages/ui/react-ui/src/components/Banner/Banner.stories.tsx'),
    name: 'Default',
  },
  'react-ui/breadcrumb': {
    load: () => import('../../../packages/ui/react-ui/src/components/Breadcrumb/Breadcrumb.stories.tsx'),
    name: 'Default',
  },
  'react-ui/card': {
    load: () => import('../../../packages/ui/react-ui/src/components/Card/Card.stories.tsx'),
    name: 'Default',
  },
  'react-ui/carousel': {
    load: () => import('../../../packages/ui/react-ui/src/components/Carousel/Carousel.stories.tsx'),
    name: 'Default',
  },
  'react-ui/collapsible': {
    load: () => import('../../../packages/ui/react-ui/src/components/Collapsible/Collapsible.stories.tsx'),
    name: 'Default',
  },
  'react-ui/color-picker': {
    load: () => import('../../../packages/ui/react-ui/src/components/ColorPicker/ColorPicker.stories.tsx'),
    name: 'Default',
  },
  'react-ui/combobox': {
    load: () => import('../../../packages/ui/react-ui/src/components/Combobox/Combobox.stories.tsx'),
    name: 'Default',
  },
  'react-ui/drag-handle': {
    load: () => import('../../../packages/ui/react-ui/src/components/DragHandle/DragHandle.stories.tsx'),
    name: 'Default',
  },
  'react-ui/editable': {
    load: () => import('../../../packages/ui/react-ui/src/components/Editable/Editable.stories.tsx'),
    name: 'Default',
  },
  'react-ui/fieldset': {
    load: () => import('../../../packages/ui/react-ui/src/components/Fieldset/Fieldset.stories.tsx'),
    name: 'Default',
  },
  'react-ui/floating-panel': {
    load: () => import('../../../packages/ui/react-ui/src/components/FloatingPanel/FloatingPanel.stories.tsx'),
    name: 'Default',
  },
  'react-ui/focus': {
    load: () => import('../../../packages/ui/react-ui/src/components/Focus/Focus.stories.tsx'),
    name: 'Default',
  },
  'react-ui/listbox': {
    load: () => import('../../../packages/ui/react-ui/src/components/Listbox/Listbox.stories.tsx'),
    name: 'Default',
  },
  'react-ui/main': {
    load: () => import('../../../packages/ui/react-ui/src/components/Main/Main.stories.tsx'),
    name: 'Default',
  },
  'react-ui/media': {
    load: () => import('../../../packages/ui/react-ui/src/components/MediaPlayer/MediaPlayer.stories.tsx'),
    name: 'Default',
  },
  'react-ui/qr-code': {
    load: () => import('../../../packages/ui/react-ui/src/components/QrCode/QrCode.stories.tsx'),
    name: 'Default',
  },
  'react-ui/scroll-container': {
    load: () => import('../../../packages/ui/react-ui/src/components/ScrollContainer/ScrollContainer.stories.tsx'),
    name: 'Default',
  },
  'react-ui/splitter': {
    load: () => import('../../../packages/ui/react-ui/src/components/Splitter/Splitter.stories.tsx'),
    name: 'Default',
  },
  'react-ui/system-button': {
    load: () => import('../../../packages/ui/react-ui/src/components/SystemButton/SystemButton.stories.tsx'),
    name: 'Default',
  },
  'react-ui/tabs': {
    load: () => import('../../../packages/ui/react-ui/src/components/Tabs/Tabs.stories.tsx'),
    name: 'Default',
  },
  'react-ui/tag': {
    load: () => import('../../../packages/ui/react-ui/src/components/Tag/Tag.stories.tsx'),
    name: 'Default',
  },
  'react-ui/toggle-group': {
    load: () => import('../../../packages/ui/react-ui/src/components/ToggleGroup/ToggleGroup.stories.tsx'),
    name: 'Default',
  },
  'react-ui/tour': {
    load: () => import('../../../packages/ui/react-ui/src/components/Tour/Tour.stories.tsx'),
    name: 'Default',
  },
  'react-ui/hover-card': {
    load: () => import('../../../packages/ui/react-ui/src/components/HoverCard/HoverCard.stories.tsx'),
    name: 'Default',
  },
  'react-ui/field': {
    load: () => import('../../../packages/ui/react-ui/src/components/Field/Field.stories.tsx'),
    name: 'Default',
  },
  'react-ui/select': {
    load: () => import('../../../packages/ui/react-ui/src/components/Select/Select.stories.tsx'),
    name: 'Default',
  },
  'react-ui/scroll-area': {
    load: () => import('../../../packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx'),
    name: 'Default',
  },
  'react-ui/typography': {
    load: () => import('../../../packages/ui/react-ui/src/components/Typography/Typography.stories.tsx'),
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

  // Core stories keep their own size; the other packages' stories fill frames their pages size by hand.
  const fit = id.startsWith('react-ui/') && story !== undefined && story.parameters?.layout !== 'fullscreen';
  useFitFrame(element, fit);

  return (
    <div ref={setElement} className='h-full'>
      {error ? (
        <p role='alert'>{error}</p>
      ) : (
        story && (
          <StoryEmbed.Root
            key={themeMode}
            story={story}
            args={entry.args}
            // Storybook centres a story whose layout is not fullscreen; a fixed-position story layout ignores this.
            classNames={
              story.parameters?.layout === 'fullscreen'
                ? 'h-full'
                : 'h-full grid [place-items:safe_center] overflow-auto'
            }
          />
        )
      )}
    </div>
  );
};

/** Space between a fitted story and its frame. */
const FIT_PADDING = 32;

/** Sizes an API page's frame to its story: as tall, up to the page's height, and wider than the text column only if it must be. */
const useFitFrame = (element: HTMLElement | null, enabled: boolean) => {
  useEffect(() => {
    const frame = element?.closest<HTMLElement>('.api-story');
    const root = element?.firstElementChild;
    if (!enabled || !frame || !root) {
      return;
    }
    const maxHeight = frame.getBoundingClientRect().height;
    let content: Element | null = null;
    const resize = new ResizeObserver(() => fit());
    const fit = () => {
      const next = storyContent(root.firstElementChild);
      if (next !== content) {
        content && resize.unobserve(content);
        content = next;
        if (content) {
          // Width is read once in the text column, so a story that fills its frame does not keep itself wide.
          frame.classList.remove('dx-wide');
          const column = frame.parentElement?.clientWidth ?? 0;
          frame.classList.toggle('dx-wide', content.scrollWidth + 2 * FIT_PADDING > column);
          resize.observe(content);
        }
      }
      if (!content) {
        return;
      }
      frame.style.height = `${Math.min(maxHeight, content.scrollHeight + 2 * FIT_PADDING)}px`;
    };
    const mutations = new MutationObserver(fit);
    mutations.observe(root, { childList: true });
    fit();
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, [element, enabled]);
};

/**
 * The element a story's size is read from: its outermost element, or, under a `fixed` centred or column layout that
 * fills any frame, the panel that layout holds.
 */
const storyContent = (element: Element | null, depth = 4): Element | null => {
  for (let current = element; current && depth > 0; current = current.firstElementChild, depth--) {
    if (getComputedStyle(current).position === 'fixed') {
      return current.firstElementChild;
    }
  }
  return element;
};
