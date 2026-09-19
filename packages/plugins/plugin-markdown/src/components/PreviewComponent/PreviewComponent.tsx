//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { Surface, useOptionalCapability } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Database, Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { URI } from '@dxos/keys';
import { Card, Icon, IconButton } from '@dxos/react-ui';
import { Attention, useAttention, useAttentionAttributes } from '@dxos/react-ui-attention';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';
import { type WidgetProps } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { parseEmbedLabel } from './parse-embed-label.ts';

// Persisted height (px) lives in the image alt text after the label, Obsidian-style: `![label|320](eid)`.

const formatEmbedLabel = (baseLabel: string, height?: number): string =>
  height != null ? `${baseLabel}|${height}` : baseLabel;

const MIN_SIZE = 6;

const FALLBACK_SIZE = 320;

/** Scroll the element's top into view (honoring its `scroll-margin`) only if that top is not already visible. */
const maybeScrollIntoView = (element: HTMLElement): void => {
  let parent = element.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      break;
    }
    parent = parent.parentElement;
  }

  const elementTop = element.getBoundingClientRect().top;
  const viewTop = parent ? parent.getBoundingClientRect().top : 0;
  const viewBottom = parent ? parent.getBoundingClientRect().bottom : window.innerHeight;
  if (elementTop < viewTop || elementTop > viewBottom) {
    element.scrollIntoView({ block: 'start', inline: 'nearest' });
  }
};

export type PreviewComponentProps = WidgetProps<{
  db?: Database.Database;
  /** The containing editor's attendable id; the embed nests under it as `<attendableId>/<object id>`. */
  attendableId?: string;
  eid: string;
  label: string;
  block?: boolean;
  suggest?: boolean;
  onOpen?: (eid: URI.URI) => void;
  /** Checks whether the linked object has a contributed surface for a role; defaults to `Surface.useIsAvailable()`. */
  isSurfaceAvailable?: ReturnType<typeof Surface.useIsAvailable>;
}>;

/**
 * Registry-backed block widget for URL-scheme preview slots.
 * Replaces the addBlockContainer callback pattern.
 * Used as the `image` widget of `objectLinks()`.
 */
export const PreviewComponent = ({
  db,
  attendableId: parentAttendableId,
  eid,
  label: labelProp,
  view,
  range,
  onOpen,
  isSurfaceAvailable: isSurfaceAvailableProp,
}: PreviewComponentProps) => {
  // Optional, not `useOperationInvoker`: that hook SUSPENDS until the capability exists, and a
  // suspending portal holds the whole editor tree un-committed — embeds never appeared on the
  // first document render. The invoker is only the open-click fallback; absence is tolerable.
  const invoker = useOptionalCapability(Capabilities.OperationInvoker);
  const invokePromise = invoker?.invokePromise;

  // Fall back to the app's surface registry unless a caller injects a check (e.g. from a story).
  const defaultIsSurfaceAvailable = Surface.useIsAvailable();
  const isSurfaceAvailable = isSurfaceAvailableProp ?? defaultIsSurfaceAvailable;
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve relative to the containing document's own database so space-relative embeds
  // (bare `echo:/<id>` URIs, used so links survive being imported into a new space) resolve.
  const uri = useMemo(() => (eid ? URI.make(eid) : undefined), [eid]);
  const ref = useMemo(() => (uri && db ? db.makeRef<Obj.Unknown>(uri) : undefined), [uri, db]);
  const object = useResolveRef(ref);
  // Tuple, not the snapshot itself: binding the array as `subject` made every surface filter's
  // instanceOf check fail, so embeds rendered nothing.
  const [subject] = useObject(object);

  // px per rem; ResizeHandle works in rem while the persisted height is in px.
  const remSize = useMemo(() => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, []);
  const { height } = parseEmbedLabel(labelProp);

  // `min-content` keeps the embed at its intrinsic height until the user resizes it;
  // the handle then measures the rendered box and switches to an explicit height.
  const [size, setSize] = useState<Size>(height != null ? height / remSize : 'min-content');

  // Nested under the editor's id (slash-qualified, like a section in a stack) so attending the embed
  // keeps the document an ancestor; the object id rather than the URI, whose slashes would split.
  const attendableId = object ? [parentAttendableId, object.id].filter(isTruthy).join('/') : undefined;
  const attentionAttributes = useAttentionAttributes(attendableId);
  const { hasAttention } = useAttention(attendableId);

  // Tell the surface it is sized by its container (vs. intrinsic) so content (e.g. an image) can fit.
  const extrinsic = size !== 'min-content';
  const data = useMemo(
    () => (subject && attendableId ? { subject, attendableId, extrinsic } : undefined),
    [subject, attendableId, extrinsic],
  );
  useEffect(() => {
    setSize(height != null ? height / remSize : 'min-content');
  }, [height, remSize]);

  // Persist the height (px) into the alt text on drop by rewriting the image node in the source.
  // The node bounds and base label are re-derived from the live document (the captured `range`/`label`
  // can lag a prior edit before React re-renders the widget).
  // When the same object is transcluded more than once, the node whose start is NEAREST the widget's
  //  range is chosen so a duplicate embed isn't rewritten by mistake.
  const handleResize = useCallback(
    (next: Size, commit?: boolean) => {
      setSize(next);
      if (!commit || typeof next !== 'number' || !view) {
        return;
      }

      const doc = view.state.doc.toString();
      let open = -1;
      let close = -1;
      const marker = `](${eid})`;
      for (let at = doc.indexOf(marker); at >= 0; at = doc.indexOf(marker, at + marker.length)) {
        const start = doc.lastIndexOf('![', at);
        if (start >= 0 && (open < 0 || Math.abs(start - range.from) < Math.abs(open - range.from))) {
          open = start;
          close = at;
        }
      }
      if (open < 0) {
        return;
      }

      const { baseLabel: currentBaseLabel } = parseEmbedLabel(doc.slice(open + 2, close));
      const insert = `![${formatEmbedLabel(currentBaseLabel, Math.round(next * remSize))}](${eid})`;
      view.dispatch({ changes: { from: open, to: close + marker.length, insert } });
      // After the resized box has laid out, bring its top into frame — but only if that top scrolled
      // out of view. Scroll the element itself (not the CM view) so it works whichever ancestor
      // actually scrolls (cm-scroller or an outer panel); defer a frame so the new height applies first.
      requestAnimationFrame(() => {
        if (containerRef.current) {
          maybeScrollIntoView(containerRef.current);
        }
      });
    },
    [view, range, eid, remSize],
  );

  // Focus lands on the container itself: the surface is inert until attended, so the click cannot
  // reach anything focusable inside it. Attention follows from the focus event.
  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!hasAttention && event.currentTarget === event.target) {
        event.currentTarget.focus();
      }
    },
    [hasAttention],
  );

  // Escape hands attention back to the document by focusing the editor.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && !event.defaultPrevented && view) {
        event.preventDefault();
        view.focus();
      }
    },
    [view],
  );

  const handleOpen = useCallback(
    (event: MouseEvent) => {
      if (!uri || !object) {
        return;
      }

      if (onOpen) {
        onOpen(uri);
      } else {
        void invokePromise?.(LayoutOperation.Open, {
          subject: [GraphPath.getObjectPathFromObject(object)],
          pivotId: Attention.getRootAttendableId(event.currentTarget),
          disposition: 'add',
          modifiers: { shift: event.shiftKey },
          navigation: 'immediate',
        });
      }
    },
    [uri, object, onOpen, invokePromise],
  );

  if (uri && object && data) {
    const objectIcon = Obj.getIcon(object);
    const objectLabel = Obj.getLabel(object);

    // Section preview.
    if (isSurfaceAvailable({ type: AppSurface.Section, data })) {
      return (
        <div
          className='relative grid scroll-mt-16 outline-hidden'
          style={sizeStyle(size, 'vertical')}
          tabIndex={0}
          data-testid='markdown.embed'
          {...attentionAttributes}
          {...resizeAttributes}
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
        >
          {/* The row is capped at the box (`minmax(0, 1fr)`): with the default `auto` row the section
              keeps its intrinsic height and only its overflow is clipped, so it never scrolls.
              Inert until attended: an unfocused embed must not swallow the wheel (the page scrolls,
              not the sketch) or take focus from a click, which lands on the container instead. */}
          <div
            className={mx(
              'grid grid-rows-[minmax(0,1fr)] overflow-hidden border border-subdued-separator rounded-md',
              hasAttention && 'ring-inset ring-focus-line ring-[var(--color-focus-ring)]',
            )}
            inert={hasAttention ? undefined : true}
          >
            <Surface.Surface type={AppSurface.Section} data={data} limit={1} />
          </div>

          <div className='absolute bottom-1 right-1 flex items-center justify-end gap-1'>
            <span className='dx-tag dx-tag--neutral flex items-center gap-1'>
              {objectIcon && <Icon icon={objectIcon.icon} size={4} />}
              {objectLabel}
            </span>
          </div>

          <div className='absolute top-1 right-1 flex items-center justify-end gap-1'>
            <IconButton
              density='sm'
              icon='ph--arrow-square-out--regular'
              iconOnly
              label='Open'
              variant='ghost'
              onClick={handleOpen}
            />
          </div>

          <ResizeHandle
            side='block-end'
            fallbackSize={FALLBACK_SIZE}
            minSize={MIN_SIZE}
            size={size}
            onSizeChange={handleResize}
          />
        </div>
      );
    }

    // Card preview.
    if (isSurfaceAvailable({ type: AppSurface.CardContent, data })) {
      return (
        <div>
          <Card.Root>
            <Card.Header>
              <Card.Block />
              <Card.Title>{objectLabel}</Card.Title>
            </Card.Header>
            <Card.Body>
              <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
            </Card.Body>
          </Card.Root>
        </div>
      );
    }
  }

  return (
    <span className='bg-card-surface text-sm border border-separator rounded-sm p-1'>
      Invalid object: <span className='font-mono'>{eid}</span>
    </span>
  );
};
