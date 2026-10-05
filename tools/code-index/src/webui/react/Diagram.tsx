//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type Scene } from '@dxos/diagram';
import { SceneSvg } from '@dxos/plugin-illustrator/SceneSvg';

import type * as Protocol from '../../workspace/Protocol.ts';

export type DiagramIslandProps = {
  readonly objects: readonly Scene.WorldObject[];
  /** Resolves a box's `ref` — an index IRI, or a path or name — to the resource it depicts. */
  readonly describe: (target: string) => Promise<Protocol.Entity>;
};

/**
 * Screen px per scene unit. At the top the scene's 18px box labels read at the canvas's ~13px text;
 * below the floor they stop being legible, so a wider diagram scrolls instead of shrinking further.
 */
const MAX_SCALE = 0.75;
const MIN_SCALE = 0.45;

/** Facts shown per box: enough to say what it is without turning the panel into a dump. */
const FACTS = 12;

/** The readable tail of an IRI — its fragment, else its last path segment. */
const localName = (iri: string): string => decodeURIComponent(iri.split('#').pop()?.split('/').pop() ?? iri);

/**
 * plugin-illustrator's SVG renderer, drawn inside the Solid canvas. The SVG fills its parent by
 * default, which shrinks a large diagram to unreadable text, so it is fitted to the panel's width
 * between a legible floor and its natural size, and refitted as the split pane is resized. A box
 * whose `ref` names an index resource is selectable, and selecting it shows that resource's facts.
 */
export const DiagramIsland = ({ objects, describe }: DiagramIslandProps) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<readonly string[]>([]);
  // A large diagram is legible only at its natural size, which the split pane rarely has room for.
  const [expanded, setExpanded] = useState(false);
  const refs = useMemo(
    () => Object.fromEntries(objects.flatMap((object) => (object.ref ? [[object.id, object.ref]] : []))),
    [objects],
  );

  useLayoutEffect(() => {
    const container = wrapper.current;
    const svg = container?.querySelector('svg');
    if (!container || !svg) {
      return;
    }
    const fit = () => {
      const { width, height } = svg.viewBox.baseVal;
      const scale = expanded ? 1 : Math.min(MAX_SCALE, Math.max(MIN_SCALE, container.clientWidth / width));
      svg.style.width = `${width * scale}px`;
      svg.style.height = `${height * scale}px`;
    };
    fit();
    let frame = 0;
    let width = container.clientWidth;
    // Refitting resizes the panel, which can toggle the canvas scrollbar and resize it again; applying
    // the fit next frame, and only for a new width, keeps that from looping inside one observation.
    const observer = new ResizeObserver(() => {
      if (container.clientWidth !== width) {
        width = container.clientWidth;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(fit);
      }
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [objects, expanded]);

  const selectedRef = selection.length === 1 ? refs[selection[0]] : undefined;
  return (
    <div className={expanded ? 'bg-baseSurface fixed inset-0 z-50 flex flex-col p-4' : 'relative'}>
      <button
        className='text-description hover:text-baseText absolute right-1 top-1 z-10 text-xs'
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'close' : 'expand'}
      </button>
      <div ref={wrapper} className={expanded ? 'flex-1 overflow-auto' : 'overflow-x-auto'}>
        <SceneSvg
          objects={objects}
          classNames='mx-auto block max-w-none'
          selection={selection}
          // Only boxes that depict something are worth selecting; the rest would highlight to no end.
          onSelectionChange={
            Object.keys(refs).length > 0 ? (ids) => setSelection(ids.filter((id) => id in refs)) : undefined
          }
        />
      </div>
      {selectedRef && <EntityCard target={selectedRef} describe={describe} />}
    </div>
  );
};

/** What a selected box depicts: the resolved IRI, a few of its facts, and what points at it. */
const EntityCard = ({ target, describe }: { target: string; describe: DiagramIslandProps['describe'] }) => {
  const [entity, setEntity] = useState<Protocol.Entity>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let current = true;
    setEntity(undefined);
    setError(undefined);
    describe(target).then(
      (described) => current && setEntity(described),
      (cause: Error) => current && setError(cause.message),
    );
    return () => {
      current = false;
    };
  }, [target, describe]);

  return (
    <div className='text-description px-1 pt-2 font-mono text-xs'>
      <p className='text-baseText break-all'>{entity?.iri ?? target}</p>
      {error && <p className='text-errorText'>{error}</p>}
      {entity && !entity.iri && (
        <p>
          {entity.candidates.length > 0
            ? `${entity.candidates.length} resources match; name one by IRI.`
            : (entity.hint ?? 'Not in the index.')}
        </p>
      )}
      {entity?.iri && (
        <dl className='mt-1 grid grid-cols-[max-content_1fr] gap-x-3'>
          {entity.outgoing.slice(0, FACTS).map((fact, index) => (
            <React.Fragment key={index}>
              <dt>{localName(fact.predicate)}</dt>
              <dd className='text-baseText truncate' title={fact.object}>
                {fact.objectKind === 'iri' ? localName(fact.object) : fact.object}
              </dd>
            </React.Fragment>
          ))}
          {entity.incomingCounts.slice(0, 4).map((count) => (
            <React.Fragment key={count.predicate}>
              <dt>← {localName(count.predicate)}</dt>
              <dd className='text-baseText'>{count.count.toLocaleString()}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  );
};
