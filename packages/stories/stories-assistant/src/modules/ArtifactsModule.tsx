//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Filter, Obj, type Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import { type Space, useObject, useQuery } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/**
 * The artifacts an agent makes in the story's space — sheets (with their charts), presentations and documents — one
 * tab each, newest first, each drawn by its plugin's own article surface. A new artifact takes the panel unless the
 * viewer has picked one.
 */
export const ArtifactsModule = () => {
  const space = Hooks.useActiveSpace();
  return space ? <ArtifactsPanel space={space} /> : null;
};

/** The artifacts shown; documents the story seeds as input (keyed) are left out, so only what the agent made shows. */
const ARTIFACTS = Filter.or(
  Filter.type(Sheet.Sheet),
  Filter.type(Presentation.Presentation),
  Filter.type(Markdown.Document),
);

/** Marks an object the story seeded rather than the agent made. */
export const SEEDED_KEY_SOURCE = 'org.dxos.storybook.seed';

const ArtifactsPanel = ({ space }: { space: Space }) => {
  const all = useQuery(space.db, ARTIFACTS);
  const artifacts = useMemo(
    () =>
      all
        .filter((object) => !Obj.getMeta(object).keys.some((key) => key.source === SEEDED_KEY_SOURCE))
        .sort((left, right) => (left.id < right.id ? 1 : -1)),
    [all],
  );
  const [picked, setPicked] = useState<string | undefined>();
  const [newest, setNewest] = useState<string | undefined>();
  // A new artifact is shown as it arrives; once the viewer picks a tab, their pick stays.
  useEffect(() => {
    const first = artifacts[0]?.id;
    if (first !== newest) {
      setNewest(first);
      setPicked(undefined);
    }
  }, [artifacts, newest]);
  const selected = artifacts.find((object) => object.id === (picked ?? newest));

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          {artifacts.length === 0 ? (
            <Toolbar.Text>Artifacts the agent creates appear here.</Toolbar.Text>
          ) : (
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
