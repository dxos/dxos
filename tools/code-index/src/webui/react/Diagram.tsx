//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type Scene } from '@dxos/diagram';
import * as SceneSvg from '@dxos/plugin-illustrator/SceneSvg';

import type * as Protocol from '../../workspace/Protocol.ts';

export type DiagramIslandProps = {
  readonly objects: readonly Scene.WorldObject[];
  /** True while the engine's full search is still running and a better layout may replace this one. */
  readonly refining: boolean;
  /** Resolves a box's `ref` — an index IRI, or a path or name — to the resource it depicts. */
  readonly describe: (target: string) => Promise<Protocol.Entity>;
};

/**
 * Screen px per scene unit. At the top the scene's 18px box labels read at the canvas's ~13px text;
 * below the floor they stop being legible, so a wider diagram scrolls instead of shrinking further.
 */
const MAX_SCALE = 0.75;
const MIN_SCALE = 0.45;

/** The colour the page is painted with: the body's when it has one, else the root element's. */
const pageBackground = (): string =>
  [document.body, document.documentElement]
    .map((element) => getComputedStyle(element).backgroundColor)
    .find((color) => color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(color)) ?? 'Canvas';

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
export const DiagramIsland = ({ objects, refining, describe }: DiagramIslandProps) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<readonly string[]>([]);
  // A large diagram is legible only at its natural size, which the split pane rarely has room for.
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);

  // The toggle is a new element on each side of the portal, so focus follows it in and back out.
  useEffect(() => {
    if (toggled.current) {
      toggle.current?.focus();
    }
    if (!expanded) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);
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
  const body = (
    <div
      className={expanded ? 'fixed inset-0 z-50 flex flex-col gap-2 p-4' : ''}
      // The theme's surface classes resolve inside the canvas but not on a node portalled to the
      // body, so the overlay takes the page's own computed background to stay opaque.
      style={expanded ? { backgroundColor: pageBackground() } : undefined}
      {...(expanded ? { 'role': 'dialog', 'aria-modal': true, 'aria-label': 'Diagram' } : {})}
    >
      <div className='text-description flex justify-end gap-3 text-xs'>
        {refining && <span>Refining layout…</span>}
        <button
          ref={toggle}
          className='hover:text-baseText'
          onClick={() => {
            toggled.current = true;
            setExpanded((value) => !value);
          }}
        >
          {expanded ? 'close' : 'expand'}
        </button>
      </div>
      <div ref={wrapper} className={expanded ? 'flex-1 overflow-auto' : 'overflow-x-auto'}>
        <SceneSvg.SceneSvg
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
  // Fixed positioning would be relative to the canvas pane, which scrolls and clips; the body is the viewport.
  return expanded ? createPortal(body, document.body) : body;
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
