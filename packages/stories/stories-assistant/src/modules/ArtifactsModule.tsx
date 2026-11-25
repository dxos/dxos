//
// Copyright 2026 DXOS.org
//

import React, { memo, useEffect, useMemo, useState } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as ObjectCard from '@dxos/app-toolkit/ObjectCard';
import { Filter, Obj, type Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import { type Space, useObject, useQuery } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

export type ArtifactsModuleData = {
  /**
   * How the artifacts are shown: one at a time through its plugin's article surface, picked from a tab per artifact
   * (`tabs`, the default), or all at once as a mosaic of cards (`cards`).
   */
  view?: 'tabs' | 'cards';
};

/**
 * The artifacts an agent makes in the story's space — sheets (with their charts), presentations and documents — newest
 * first. As tabs, each new artifact takes the panel as it arrives and between arrivals the viewer's pick holds; as
 * cards, each new artifact adds a card.
 */
export const ArtifactsModule = ({ data }: Surface.ComponentProps<ArtifactsModuleData>) => {
  const space = Hooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return data.view === 'cards' ? <ArtifactCards space={space} /> : <ArtifactsPanel space={space} />;
};

const ARTIFACTS = Filter.or(
  Filter.type(Sheet.Sheet),
  Filter.type(Presentation.Presentation),
  Filter.type(Markdown.Document),
);

/** The space's artifacts, newest first. */
const useArtifacts = (space: Space) => {
  const all = useQuery(space.db, ARTIFACTS);
  return useMemo(() => [...all].sort((left, right) => (left.id < right.id ? 1 : -1)), [all]);
};

const ArtifactsPanel = ({ space }: { space: Space }) => {
  const artifacts = useArtifacts(space);
  const [picked, setPicked] = useState<string | undefined>();
  const [newest, setNewest] = useState<string | undefined>();
  // A new artifact is shown as it arrives, replacing the viewer's pick, so the panel follows the agent's work.
  useEffect(() => {
    const first = artifacts[0]?.id;
    if (first !== newest) {
      setNewest(first);
      setPicked(undefined);
    }
  }, [artifacts, newest]);
  const selected = artifacts.find((object) => object.id === (picked ?? newest));

  return (
    <Panel.Root data-testid='artifacts-module.tabs'>
      <Panel.Header>
        <Toolbar.Root>
          {artifacts.length > 0 && (
            <Toolbar.ToggleGroup
              type='single'
              value={selected?.id ?? ''}
              onValueChange={(value: string) => value && setPicked(value)}
              aria-label='Artifacts'
            >
              {artifacts.map((object) => (
                <ToggleGroup.Item
                  key={object.id}
                  value={object.id}
                  icon={ICONS[kindOf(object)]}
                  data-artifact={kindOf(object)}
                  label={Obj.getLabel(object) ?? object.id}
                />
              ))}
            </Toolbar.ToggleGroup>
          )}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='overflow-auto'>
        {selected && <Artifact key={selected.id} space={space} object={selected} />}
      </Panel.Body>
    </Panel.Root>
  );
};

const ArtifactCards = ({ space }: { space: Space }) => {
  const artifacts = useArtifacts(space);
  return (
    <Panel.Root data-testid='artifacts-module.cards'>
      <Panel.Header asChild>
        <Toolbar.Root>
          <Toolbar.Text>Artifacts</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root classNames='dx-grow'>
          <ScrollArea.Viewport>
            {artifacts.length > 0 && (
              // No `Masonry.Content`: its own scroll area would fight the panel's.
              <Masonry.Root Tile={ArtifactCard} centered={false}>
                <Masonry.Viewport items={artifacts} getId={(object) => object.id} scroll={false} />
              </Masonry.Root>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

/** One artifact as a card: its icon and label, then whatever preview its type contributes. */
const ArtifactCard = memo(({ data }: { data: Obj.Unknown | undefined; index: number }) => {
  const [object] = useObject(data);
  const cardData = useMemo<AppSurface.ObjectCardData | undefined>(() => (data ? { subject: data } : undefined), [data]);
  if (!data || !object || !cardData) {
    return null;
  }

  return (
    <ObjectCard.Root data-testid='artifacts-module.card' data-artifact={kindOf(data)}>
      <ObjectCard.Header subject={object} lines={2}>
        {Obj.getLabel(object)}
      </ObjectCard.Header>
      <Surface.Surface type={AppSurface.CardContent} data={cardData} limit={1} />
    </ObjectCard.Root>
  );
});

ArtifactCard.displayName = 'ArtifactCard';

type ArtifactKind = 'sheet' | 'presentation' | 'document';

const ICONS: Record<ArtifactKind, string> = {
  sheet: 'ph--grid-nine--regular',
  presentation: 'ph--presentation--regular',
  document: 'ph--article--regular',
};

const kindOf = (object: Obj.Unknown): ArtifactKind =>
  Obj.instanceOf(Sheet.Sheet, object)
    ? 'sheet'
    : Obj.instanceOf(Presentation.Presentation, object)
      ? 'presentation'
      : 'document';

/** One artifact through its article surface; a sheet also draws each of its charts below the grid. */
const Artifact = ({ space, object }: { space: Space; object: Obj.Unknown }) => {
  if (!Obj.instanceOf(Sheet.Sheet, object)) {
    return (
      <div className='flex flex-col h-full'>
        <ArticleSurface space={space} subject={object} classNames='dx-grow' />
      </div>
    );
  }

  // Article surfaces fill their container's height, so a sheet stacked above its charts needs a definite one.
  return (
    <div className='flex flex-col gap-2'>
      <ArticleSurface space={space} subject={object} classNames='h-[16rem] shrink-0' />
      {(object.charts ?? []).map((ref) => (
        <ChartSurface key={ref.uri.toString()} space={space} chart={ref} />
      ))}
    </div>
  );
};

const ChartSurface = ({ space, chart }: { space: Space; chart: Ref.Ref<Sheet.Chart> }) => {
  useObject(chart);
  const target = chart.target;
  return target ? <ArticleSurface space={space} subject={target} classNames='h-[22rem] shrink-0' /> : null;
};

const ArticleSurface = ({
  space,
  subject,
  classNames,
}: {
  space: Space;
  subject: Obj.Unknown;
  classNames?: string;
}) => {
  const attendableId = GraphPath.getCollectionsPath(space.id, subject.id);
  return (
    <AttendableContainer id={attendableId} classNames={['relative flex flex-col', classNames]}>
      <Surface.Surface type={AppSurface.Article} limit={1} data={{ subject, attendableId }} />
    </AttendableContainer>
  );
};
