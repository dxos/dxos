//
// Copyright 2026 DXOS.org
//

/** Each demo's story by demo id: its export name, which its module in `@dxos/stories-echo/stories` is also named. */
export const DEMO_STORIES: Record<string, string> = {
  diagram: 'Diagram',
  editor: 'Editor',
  explorer: 'Explorer',
  views: 'Views',
};

/** The demos on `/echo`, in tab order; the first is shown at load. */
export const ECHO_DEMOS = ['editor', 'views', 'explorer', 'diagram'];
