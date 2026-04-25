//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppSurface, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Agent } from '@dxos/assistant-toolkit';
import { Annotation, Filter, Obj, Query, Ref } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { QueueService } from '@dxos/compute';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Message, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';
import { Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { composable } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

type Tab = 'artifacts' | 'inputs';

export type AgentArticleProps = AppSurface.ObjectArticleProps<Agent.Agent>;

export const AgentArticle = ({ role, subject: agent }: AgentArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [tab, setTab] = useState<Tab>('artifacts');
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const [computeRuntime] = useCapabilities(AutomationCapabilities.ComputeRuntime);
  // TODO(burdon): Clear input queue also.
  const handleResetHistory = useCallback(async () => {
    if (!computeRuntime) {
      return;
    }

    const space = Obj.getDatabase(agent);
    if (!space) {
      return;
    }

    const runtime = computeRuntime.getRuntime(space.spaceId);
    await runtime.runPromise(Agent.resetChatHistory(agent));
    if (!agent.queue) {
      await runtime.runPromise(
        Effect.gen(function* () {
          const queue = yield* QueueService.createQueue();
          Obj.change(agent, (agent) => {
            agent.queue = Ref.fromDXN(queue.dxn);
          });
        }),
      );
    }
  }, [agent, computeRuntime]);

  const artifacts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(agent).pipe((agent) =>
          Atom.make((get) => {
            return get(agent)
              .artifacts.map((artifact) => get(AtomRef.make(artifact.data)))
              .filter(isNonNullable);
          }),
        ),
      [agent],
    ),
  );

  const inputQueue = useAtomValue(
    AtomObj.make(agent).pipe((_) =>
      Atom.make((get) =>
        Option.fromNullable(get(_).queue).pipe(Option.map(AtomRef.make), Option.map(get), Option.getOrUndefined),
      ),
    ),
  );

  const inputObjects = useQuery(inputQueue, Query.select(Filter.everything()));

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.ToggleGroup type='single' value={tab} onValueChange={(value) => value && setTab(value as Tab)}>
            <Toolbar.ToggleGroupIconItem value='artifacts' label={t('artifacts.label')} icon='ph--cube--regular' />
            <Toolbar.ToggleGroupIconItem value='inputs' label={t('input-queue.label')} icon='ph--queue--regular' />
          </Toolbar.ToggleGroup>
          <Toolbar.Separator />
          <Toolbar.IconButton
            icon='ph--trash--regular'
            label={t('reset-history.button')}
            onCanPlay={handleResetHistory}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='dx-container flex flex-col'>
        {tab === 'artifacts' && (
          <>
            {artifacts.length === 0 && (
              <Message.Root classNames='m-2' valence='info'>
                <Message.Title>{t('project-empty-spec.message')}</Message.Title>
                <Message.Content>{t('project-empty-spec.description')}</Message.Content>
              </Message.Root>
            )}

            <Masonry.Root Tile={MasonryArtifactTile}>
              <Masonry.Content items={artifacts} getId={(item: Obj.Unknown) => item.id} padding thin centered />
            </Masonry.Root>
          </>
        )}

        {tab === 'inputs' && (
          <Mosaic.Container asChild withFocus autoScroll={viewport} classNames='dx-document'>
            <ScrollArea.Root orientation='vertical' padding thin centered>
              <ScrollArea.Viewport ref={setViewport}>
                <Mosaic.VirtualStack
                  Tile={StackTile}
                  classNames='gap-2'
                  draggable={false}
                  estimateSize={() => 160}
                  gap={8}
                  getId={(item: Obj.Unknown) => item.id}
                  getScrollElement={() => viewport}
                  items={inputObjects}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const ArtifactTileCard = composable<HTMLDivElement, { data: Obj.Unknown }>(({ data, ...props }, forwardedRef) => {
  const objectMenuItems = useObjectMenuItems(data);
  const icon = Function.pipe(
    Obj.getSchema(data),
    Option.fromNullable,
    Option.flatMap(Annotation.IconAnnotation.get),
    Option.map(({ icon }) => icon),
    Option.getOrElse(() => 'ph--placeholder--regular'),
  );

  return (
    <Card.Root {...props} ref={forwardedRef} data-testid='board-item' fullWidth>
      <Card.Toolbar>
        <Card.IconBlock padding>
          <Card.Icon icon={icon} />
        </Card.IconBlock>
        <Card.Title>{Obj.getLabel(data)}</Card.Title>
        {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
        <Card.IconBlock padding>
          <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
            <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
          </Menu.Trigger>
          <Menu.Content items={objectMenuItems} />
        </Card.IconBlock>
      </Card.Toolbar>
      <Card.Content>
        <Surface.Surface
          type={AppSurface.Card}
          limit={1}
          data={{ subject: data } satisfies AppSurface.ObjectCardData}
        />
      </Card.Content>
    </Card.Root>
  );
});

ArtifactTileCard.displayName = 'ArtifactTileCard';

const MasonryArtifactTile = ({ data }: { data: Obj.Unknown; index: number }) => (
  <Menu.Root>
    <ArtifactTileCard data={data} />
  </Menu.Root>
);

const StackTile = forwardRef<HTMLDivElement, MosaicTileProps<Obj.Unknown>>(
  ({ data, location, debug, current }, forwardedRef) => (
    <Menu.Root>
      <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
        <Focus.Item asChild current={current}>
          <ArtifactTileCard ref={forwardedRef} data={data} />
        </Focus.Item>
      </Mosaic.Tile>
    </Menu.Root>
  ),
);

StackTile.displayName = 'StackTile';
