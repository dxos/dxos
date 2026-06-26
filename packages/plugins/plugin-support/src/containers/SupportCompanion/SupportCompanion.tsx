//
// Copyright 2026 DXOS.org
//

// Generic plank companion — attaches to any ECHO article and renders the
// description from the meta of the plugin that owns the article's typename.
//
// Resolution: `manager.capabilities.atomByModule(AppCapabilities.Schema)`
// gives us a `Record<moduleId, ReadonlyArray<Schema>[]>`. We find the module
// whose contributed schemas include the article's typename, then map that
// module back to its plugin via `manager.getPlugins()`.

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { Carousel, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { MarkdownView } from '@dxos/react-ui-markdown';

// The surface registration constrains incoming data to
// `AppSurface.ArticleProps<'help', {}, Obj.Any>` (companion node with
// `data: 'help'`, parent article is an ECHO object) but this component only
// consumes `companionTo`, so we pick it off the article shape rather than
// requiring callers to thread the rest.
export type SupportCompanionProps = Pick<AppSurface.ArticleProps<'help', {}, Obj.Any>, 'companionTo'>;

/**
 * Plank companion panel showing help for any open ECHO article. Resolves the
 * article's typename to the plugin that registered its schema and renders that
 * plugin's `meta.profile.description` (Markdown) and `meta.profile.screenshots` (Carousel).
 */
export const SupportCompanion = ({ companionTo }: SupportCompanionProps) => {
  const manager = usePluginManager();
  const schemasByModule = useAtomValue(manager.capabilities.atomByModule(AppCapabilities.Schema));

  const { content, screenshots } = useMemo(() => {
    const empty = { content: '', screenshots: [] as readonly string[] };
    const typename = Obj.getTypename(companionTo);
    if (!typename) {
      return empty;
    }

    // Find the module whose contributed schemas include this typename.
    const owningModuleId = Object.entries(schemasByModule).find(([, contributions]) =>
      contributions.some((schemas) => schemas.some((schema) => Type.getTypename(schema) === typename)),
    )?.[0];
    if (!owningModuleId) {
      return empty;
    }

    // Map module id → plugin.
    const owningPlugin = manager
      .getPlugins()
      .find((plugin) => plugin.modules.some((module) => module.id === owningModuleId));
    return {
      content: owningPlugin?.meta.profile.description ?? '',
      screenshots: (owningPlugin?.meta.profile.screenshots ?? [])
        .map((s) => (typeof s === 'string' ? s : (s.light ?? s.dark ?? '')))
        .filter(Boolean),
    };
  }, [companionTo, manager, schemasByModule]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 flex flex-col items-center gap-4'>
            {screenshots.length > 0 && (
              <Carousel.Root count={screenshots.length} transition='slide'>
                <Carousel.Content classNames='w-full'>
                  <Carousel.Previous />
                  <Carousel.Viewport>
                    {screenshots.map((src, index) => (
                      <Carousel.Slide key={src} index={index} src={src} />
                    ))}
                  </Carousel.Viewport>
                  <Carousel.Next />
                  <Carousel.Indicators />
                </Carousel.Content>
              </Carousel.Root>
            )}
            <MarkdownView classNames='w-full' content={content} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
