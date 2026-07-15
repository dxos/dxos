//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { URI } from '@dxos/keys';
import { useResolveRef } from '@dxos/react-client/echo';
import { Icon, IconButton } from '@dxos/react-ui';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';
import { type XmlWidgetProps } from '@dxos/ui-editor';

// Persisted height (px) lives in the image alt text after the label, Obsidian-style: `![label|320](dxn)`.
const HEIGHT_PATTERN = /^(.*)\|(\d+)$/;

const parseEmbedLabel = (alt: string): { baseLabel: string; height?: number } => {
  const match = HEIGHT_PATTERN.exec(alt ?? '');
  if (match) {
    const height = Number.parseInt(match[2], 10);
    if (Number.isFinite(height) && height > 0) {
      return { baseLabel: match[1], height };
    }
  }
  return { baseLabel: alt ?? '' };
};

const formatEmbedLabel = (baseLabel: string, height?: number): string =>
  height != null ? `${baseLabel}|${height}` : baseLabel;

const MIN_SIZE = 6;
const FALLBACK_SIZE = 320;

/** Scroll the element's top into view (honoring its `scroll-margin`) only if that top is not already visible. */
const scrollTopIntoViewIfNeeded = (element: HTMLElement): void => {
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

export type PreviewComponentProps = XmlWidgetProps<{
  space?: Space;
  dxn: string;
  label: string;
  block?: boolean;
  suggest?: boolean;
  onOpen?: (dxn: URI.URI) => void;
}>;

/**
 * Registry-backed block widget for URL-scheme preview slots.
 * Replaces the addBlockContainer callback pattern.
 * Used as the Component entry in a urlSchemes XmlWidgetDef.
 */
export const PreviewComponent = ({ view, range, space, dxn, label: labelProp, onOpen }: PreviewComponentProps) => {
  const { invokePromise } = useOperationInvoker();
  const containerRef = useRef<HTMLDivElement>(null);
  const uri = useMemo(() => (dxn ? URI.make(dxn) : undefined), [dxn]);
  // Resolve relative to the containing document's own space so space-relative embeds
  // (bare `echo:/<id>` URIs, used so links survive being imported into a new space) resolve.
  const ref = useMemo(() => (uri && space ? space.db.makeRef<Obj.Unknown>(uri) : undefined), [uri, space]);
  const subject = useResolveRef(ref);

  // px per rem; ResizeHandle works in rem while the persisted height is in px.
  const remSize = useMemo(() => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, []);
  const { height } = parseEmbedLabel(labelProp);

  // `min-content` keeps the embed at its intrinsic height until the user resizes it; the handle then
  // measures the rendered box and switches to an explicit height.
  const [size, setSize] = useState<Size>(height != null ? height / remSize : 'min-content');

  // Tell the surface it is sized by its container (vs. intrinsic) so content (e.g. an image) can fit.
  const extrinsic = size !== 'min-content';
  const data = useMemo(
    () => (subject ? { subject, attendableId: dxn, extrinsic } : undefined),
    [subject, dxn, extrinsic],
  );
  useEffect(() => {
    setSize(height != null ? height / remSize : 'min-content');
  }, [height, remSize]);

  // Persist the height (px) into the alt text on drop by rewriting the image node in the source. The
  // node bounds and base label are re-derived from the live document (the captured `range`/`label`
  // can lag a prior edit before React re-renders the widget). When the same object is transcluded
  // more than once, the node whose start is NEAREST the widget's range is chosen so a duplicate
  // embed isn't rewritten by mistake.
  const handleResize = useCallback(
    (next: Size, commit?: boolean) => {
      setSize(next);
      if (!commit || typeof next !== 'number' || !view) {
        return;
      }

      const doc = view.state.doc.toString();
      const marker = `](${dxn})`;
      let open = -1;
      let close = -1;
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
      const insert = `![${formatEmbedLabel(currentBaseLabel, Math.round(next * remSize))}](${dxn})`;
      view.dispatch({ changes: { from: open, to: close + marker.length, insert } });
      // After the resized box has laid out, bring its top into frame — but only if that top scrolled
      // out of view. Scroll the element itself (not the CM view) so it works whichever ancestor
      // actually scrolls (cm-scroller or an outer panel); defer a frame so the new height applies first.
      requestAnimationFrame(() => {
        if (containerRef.current) {
          scrollTopIntoViewIfNeeded(containerRef.current);
        }
      });
    },
    [view, range, dxn, remSize],
  );

  // Open the referenced object: defer to the caller's handler when provided, else navigate to it.
  const handleOpen = useCallback(() => {
    if (!uri || !subject) {
      return;
    }
    if (onOpen) {
      onOpen(uri);
    } else {
      void invokePromise?.(LayoutOperation.Open, {
        subject: [Paths.getObjectPathFromObject(subject)],
        navigation: 'immediate',
      });
    }
  }, [uri, subject, onOpen, invokePromise]);

  if (!uri || !subject || !data) {
    return null;
  }

  const objectLabel = Obj.getLabel(subject);
  const objectIcon = Obj.getIcon(subject);

  // TODO(burdon): Determine if card or entire document from annotation? GFM?
  // TODO(burdon0: Different role: move wrapper below into role?
  const simple = true;
  if (simple) {
    return (
      <div className='flex justify-center'>
        <Surface.Surface type={AppSurface.Section} data={data} limit={1} />
      </div>
    );
  }

  // Frame transcluded block embeds so they read as a self-contained card within the document flow.
  // The clip/border live on an inner element so they don't clip the resize handle (which straddles the
  // bottom edge); the inner grid stretches the surface to fill the resizable box, overriding any
  // intrinsic aspect.
  return (
    <div
      className='relative grid scroll-mt-16'
      style={sizeStyle(size, 'vertical')}
      {...resizeAttributes}
      ref={containerRef}
    >
      <div className='grid overflow-hidden border border-subdued-separator rounded-md'>
        <Surface.Surface type={AppSurface.Section} data={data} limit={1} />
      </div>

      {/* TODO(burdon): Config option. */}
      <div className='absolute top-1 right-1 flex items-center justify-end gap-1'>
        <span className='dx-tag dx-tag--neutral flex items-center gap-1'>
          {objectIcon && <Icon icon={objectIcon.icon} size={4} />}
          {objectLabel}
        </span>
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
};
