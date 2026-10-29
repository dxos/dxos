//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tabs from '@dxos/react-ui/Tabs';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { mx } from '@dxos/ui-theme';

import { ChapterList } from './ChapterList.tsx';
import { CopyBlock, Slate, useCopy } from './Details.tsx';
import { Shortcuts, useKeyboard } from './Shortcuts.tsx';
import { SpecView } from './SpecView.tsx';
import { Timeline } from './Timeline.tsx';
import { type Download, Transport } from './Transport.tsx';
import { type Manifest } from './types.ts';
import { formatClock, usePlayback } from './usePlayback.ts';

export type PlayerView = 'chapters' | 'spec';

export type PlayerProps = {
  manifest: Manifest;
  /** The demo to open on, by id; the first otherwise. */
  initialDemo?: string;
  /** Called with the demo's id when the viewer moves to another one, e.g. to keep the page's `#hash` in step. */
  onDemoChange?: (id: string) => void;
  /** The side panel to open on; the chapter list unless the viewer chose the spec before. */
  initialView?: PlayerView;
  onViewChange?: (view: PlayerView) => void;
};

/** A bundle path, or the hosted copy of it when the page cannot reach the file itself (inside an Artifact). */
const resolve = (manifest: Manifest, path: string) =>
  manifest.hosted && !/^[a-z]+:/i.test(path) ? new URL(path, manifest.hosted).href : path;

/**
 * Plays an autocue bundle: a reel of demos, each a video whose steps are chapters on the timeline. The side panel
 * lists the chapters, or (the advanced view) shows the `.mdl` test the take was written from with the current step
 * highlighted; both seek on a click and follow the same keys.
 */
export const Player = ({ manifest, initialDemo, onDemoChange, initialView, onViewChange }: PlayerProps) => {
  const demos = manifest.demos;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      demos.findIndex((demo) => demo.id === initialDemo),
    ),
  );
  const demo = demos[index];
  const playback = usePlayback(demo?.chapters ?? [], demo?.duration);
  const [view, setView] = useState<PlayerView>(initialView === 'spec' && demo?.spec ? 'spec' : 'chapters');
  const [help, setHelp] = useState(false);
  const { copied, copy } = useCopy();
  const screenRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLElement>(null);

  const selectDemo = useCallback(
    (next: number) => {
      if (!demos.length) {
        return;
      }
      const wrapped = (next + demos.length) % demos.length;
      setIndex(wrapped);
      onDemoChange?.(demos[wrapped].id);
    },
    [demos, onDemoChange],
  );

  // A new demo is a new source on the same element, so its listeners survive; reload it explicitly.
  useEffect(() => {
    playback.videoRef.current?.load();
  }, [demo?.id]);

  const changeView = useCallback(
    (next: PlayerView) => {
      setView(next);
      onViewChange?.(next);
    },
    [onViewChange],
  );

  const fullscreen = useCallback(() => {
    const screen = screenRef.current;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void screen?.requestFullscreen?.().catch(() => playback.notify('Fullscreen is not available here'));
    }
  }, [playback]);

  const keyboard = useMemo(
    () => ({
      playback,
      previousDemo: () => selectDemo(index - 1),
      nextDemo: () => selectDemo(index + 1),
      toggleView: () => demo?.spec && changeView(view === 'spec' ? 'chapters' : 'spec'),
      copyPrompt: () => {
        if (demo?.prompt) {
          void copy('prompt', demo.prompt);
          playback.notify('Prompt copied');
        }
      },
      fullscreen,
      showHelp: () => setHelp(true),
      disabled: help,
    }),
    [playback, selectDemo, index, demo, view, changeView, copy, fullscreen, help],
  );
  useKeyboard(keyboard);

  const downloads = useMemo<Download[]>(() => {
    const links: Download[] = [];
    const video = demo?.videos[0];
    if (video) {
      links.push({
        label: 'Video',
        href: resolve(manifest, video.src),
        icon: 'ph--download-simple--regular',
        external: !!manifest.hosted,
      });
    }
    if (manifest.archive) {
      links.push({
        label: 'Bundle',
        href: resolve(manifest, manifest.archive),
        icon: 'ph--file-zip--regular',
        external: !!manifest.hosted,
      });
    }
    return links;
  }, [manifest, demo]);

  if (!demo) {
    return (
      <Layout.Flex center classNames='h-full text-fg-muted' role='status'>
        This bundle holds no demos.
      </Layout.Flex>
    );
  }

  const created = manifest.created && new Date(manifest.created).toLocaleDateString(undefined, { dateStyle: 'medium' });

  return (
    <div className='flex flex-col bg-base-surface text-fg'>
      {/* The first screen is the player, edge to edge; the details are below the fold. */}
      <div className='grid grid-cols-1 grid-rows-[auto_auto_auto] lg:h-dvh lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_minmax(0,1fr)]'>
        <Layout.Flex
          gap='md'
          align='center'
          classNames='min-w-0 border-b border-separator px-3 py-1.5 lg:col-span-2'
          asChild
        >
          <header>
            <h1 className='min-w-12 truncate font-semibold text-fg'>{manifest.title}</h1>
            <span className='hidden shrink-0 text-sm text-fg-muted sm:inline'>
              {demos.length} demo{demos.length === 1 ? '' : 's'}
              {created ? ` · ${created}` : ''}
            </span>
            {demos.length > 1 && (
              <Tabs.Root
                value={demo.id}
                onValueChange={(id) => selectDemo(demos.findIndex((item) => item.id === id))}
                classNames='min-w-0'
              >
                <Tabs.List aria-label='Demos' classNames='overflow-x-auto'>
                  {demos.map((item, position) => (
                    <Tabs.Trigger
                      key={item.id}
                      value={item.id}
                      label={`${position + 1}. ${item.title} · ${formatClock(item.duration)}`}
                    />
                  ))}
                </Tabs.List>
              </Tabs.Root>
            )}
            <Layout.Flex gap='xs' grow={false} classNames='ms-auto shrink-0'>
              <Button.Root
                variant='ghost'
                icon='ph--info--regular'
                label='Details'
                onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              />
              <Button.Root
                variant='ghost'
                icon='ph--keyboard--regular'
                label='Shortcuts'
                onClick={() => setHelp(true)}
              />
            </Layout.Flex>
          </header>
        </Layout.Flex>

        <Layout.Flex column classNames='min-h-0 min-w-0'>
          <div ref={screenRef} className='relative aspect-video min-h-0 bg-black lg:aspect-auto lg:flex-1'>
            <video
              ref={playback.videoRef}
              playsInline
              preload='metadata'
              poster={demo.poster}
              onClick={playback.toggle}
              className='dx-cover dx-fill object-contain'
            >
              {demo.videos.map((video) => (
                <source key={video.src} src={video.src} type={video.type} />
              ))}
            </video>
            {!playback.playing && playback.time < 0.05 && (
              <Layout.Flex center classNames='pointer-events-none dx-cover'>
                <Button.Root
                  variant='primary'
                  icon='ph--play--fill'
                  label='Play'
                  iconOnly
                  size='lg'
                  onClick={playback.toggle}
                  classNames='pointer-events-auto rounded-full'
                />
              </Layout.Flex>
            )}
            <div
              aria-live='polite'
              className={mx(
                'pointer-events-none absolute end-3 top-3 rounded-sm bg-scrim-surface px-2.5 py-1 font-mono text-sm text-fg transition-opacity',
                playback.flash ? 'opacity-100' : 'opacity-0',
              )}
            >
              {playback.flash}
            </div>
          </div>
          <div className='border-t border-separator px-3'>
            <Timeline
              chapters={demo.chapters}
              time={playback.time}
              duration={playback.duration}
              current={playback.chapter}
              onSeek={playback.seek}
            />
          </div>
          <div className='px-1 pb-1'>
            <Transport playback={playback} chapters={demo.chapters} downloads={downloads} onFullscreen={fullscreen} />
          </div>
        </Layout.Flex>

        <Panel.Root classNames='h-[60vh] min-h-0 border-t border-separator bg-base-surface lg:h-auto lg:border-s lg:border-t-0'>
          <Panel.Header classNames='border-b border-separator px-2'>
            <ToggleGroup.Root
              type='single'
              value={view}
              onValueChange={(value) => (value === 'chapters' || value === 'spec') && changeView(value)}
              aria-label='Side panel'
            >
              <ToggleGroup.Item value='chapters' icon='ph--list-numbers--regular' label='Chapters' />
              <ToggleGroup.Item value='spec' icon='ph--file-code--regular' label='Spec' disabled={!demo.spec} />
            </ToggleGroup.Root>
          </Panel.Header>
          <Panel.Body asChild>
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport>
                {view === 'spec' && demo.spec ? (
                  <SpecView spec={demo.spec} current={playback.chapter} onSelect={playback.seekChapter} />
                ) : (
                  <ChapterList chapters={demo.chapters} current={playback.chapter} onSelect={playback.seekChapter} />
                )}
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Body>
        </Panel.Root>
      </div>

      <section
        ref={detailsRef}
        aria-label='Details'
        className='grid grid-cols-1 border-t border-separator xl:grid-cols-3 xl:divide-x xl:divide-separator'
      >
        <Slate demo={demo} />
        {demo.prompt && (
          <CopyBlock
            title='Run it yourself'
            text={demo.prompt}
            copied={copied === 'prompt'}
            onCopy={() => void copy('prompt', demo.prompt ?? '')}
          />
        )}
        {demo.script && (
          <CopyBlock
            title='Autocue script'
            text={demo.script.source}
            copied={copied === 'script'}
            onCopy={() => void copy('script', demo.script?.source ?? '')}
            collapsed={`${demo.script.path} · ${demo.script.source.split('\n').length} lines`}
          />
        )}
      </section>

      <Shortcuts open={help} onOpenChange={setHelp} />
    </div>
  );
};
