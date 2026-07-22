//
// Copyright 2026 DXOS.org
//

import React, {
  type ComponentProps,
  Fragment,
  type KeyboardEventHandler,
  type ReactNode,
  forwardRef,
  useMemo,
} from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, AttentionSigil, type AttentionSigilAction } from '@dxos/app-toolkit/ui';
import { type Node } from '@dxos/plugin-graph';
import { Breadcrumb, Icon, Popover, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';

import { meta } from '#meta';

import { Pane } from '../Pane';

type SurfaceProps = ComponentProps<typeof Surface.Surface>;

export type PlankProps = ThemedClassName<{
  node: Node.Node;
  /** Attendable id; defaults to the node id. */
  attendableId?: string;
  /** Grouped sigil menu actions; when present the sigil opens a menu, otherwise it is a plain button. */
  actions?: AttentionSigilAction[][];
  onAction?: (action: AttentionSigilAction) => void;
  /** Navigation-history trail rendered before the title (flat mode); clicking one goes back to it. */
  breadcrumbs?: { id: string; label: string }[];
  onSelectBreadcrumb?: (id: string) => void;
  /** Toolbar controls rendered after the title (e.g. close/solo/fullscreen). */
  controls?: ReactNode;
  /** Toolbar content rendered between the title and the controls (e.g. a NavbarEnd surface). */
  navbarEnd?: ReactNode;
  /** Sigil-menu footer content (e.g. a MenuFooter surface). */
  sigilFooter?: ReactNode;
  /** Highlight the title/sigil when a related (companion) region is attended. */
  related?: boolean;
  /** Render the title in a muted style (e.g. while the subject is loading). */
  pending?: boolean;
  /** When it matches `${meta.key}:${node.id}`, anchors a popover to the sigil. */
  popoverAnchorId?: string;
  /** Extra Article surface data merged over the computed defaults (e.g. companionTo/variant/path). */
  articleData?: Partial<AppSurface.ArticleData>;
  /** Error fallback for the content surface. */
  fallback?: SurfaceProps['fallback'];
  /** Loading placeholder for the content surface. */
  placeholder?: SurfaceProps['placeholder'];
  /** Render only the content surface, omitting the toolbar (e.g. fullscreen). */
  headless?: boolean;
  // TODO(burdon): Why is this required?
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}>;

/**
 * A higher-level deck pane bound to a graph {@link Node}: renders the node's sigil, title and content
 * Surface inside a {@link Pane}, and makes itself the node's attendable region. Toolbar controls
 * (close/solo/etc.) and framework surfaces (NavbarEnd/MenuFooter) are supplied by the container via
 * slots so this component stays free of capabilities/operations.
 */
export const Plank = forwardRef<HTMLDivElement, PlankProps>(
  (
    {
      classNames,
      node,
      attendableId = node.id,
      actions,
      onAction,
      breadcrumbs,
      onSelectBreadcrumb,
      controls,
      navbarEnd,
      sigilFooter,
      related,
      pending,
      popoverAnchorId,
      articleData,
      fallback,
      placeholder,
      headless,
      onKeyDown,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.profile.key);
    const attentionAttrs = useAttentionAttributes(attendableId);
    const icon = node.properties?.icon ?? 'ph--circle-dashed--regular';
    const label = toLocalizedString(node.properties?.label ?? '', t);
    const data = useMemo<AppSurface.ArticleData>(
      () => ({ attendableId, subject: node.data, properties: node.properties, popoverAnchorId, ...articleData }),
      [attendableId, node.data, node.properties, popoverAnchorId, articleData],
    );

    // Anchor the sigil's popover only when this plank's menu is the active popover target.
    const ActionRoot = popoverAnchorId === `${meta.profile.key}:${node.id}` ? Popover.Anchor : Fragment;

    return (
      <Pane.Root
        ref={forwardedRef}
        classNames={classNames}
        tabIndex={0}
        onKeyDown={onKeyDown}
        {...attentionAttrs}
        data-testid='deck.plank'
      >
        {!headless && (
          <Pane.Toolbar>
            <ActionRoot>
              {actions && actions.length > 0 ? (
                <AttentionSigil
                  icon={icon}
                  related={related}
                  attendableId={attendableId}
                  actions={actions}
                  onAction={onAction}
                  triggerLabel={label}
                >
                  {sigilFooter}
                </AttentionSigil>
              ) : (
                <Pane.Sigil attendableId={attendableId}>
                  <span className='sr-only'>{label}</span>
                  <Icon icon={icon} />
                </Pane.Sigil>
              )}
            </ActionRoot>
            {breadcrumbs && breadcrumbs.length > 0 ? (
              // Flat mode: the navigation history plus the current plank as one Breadcrumb. Root grows to
              // fill the toolbar (packing the trail + title left, controls right), and its trail links
              // shrink far faster than the title (shrink-[999]) so breadcrumb labels truncate first.
              <Breadcrumb.Root aria-label={t('breadcrumbs.label')} classNames='min-w-0 grow shrink gap-1'>
                <Breadcrumb.List>
                  {breadcrumbs.map((crumb) => (
                    <Breadcrumb.ListItem key={crumb.id}>
                      <Breadcrumb.Link asChild>
                        <button
                          type='button'
                          className='min-w-0 shrink-[999] truncate rounded-sm px-1 text-sm text-description hover:text-baseText'
                          onClick={() => onSelectBreadcrumb?.(crumb.id)}
                        >
                          {crumb.label}
                        </button>
                      </Breadcrumb.Link>
                      <Breadcrumb.Separator />
                    </Breadcrumb.ListItem>
                  ))}
                  <Breadcrumb.ListItem>
                    <Breadcrumb.Current asChild>
                      {/* The current plank stays the attention-aware Pane.Title; grow-0 so it keeps its
                          content width and truncates only once the trail has collapsed. */}
                      <Pane.Title
                        attendableId={attendableId}
                        related={related}
                        classNames={[pending && 'text-description', 'grow-0 w-auto']}
                      >
                        {label}
                      </Pane.Title>
                    </Breadcrumb.Current>
                  </Breadcrumb.ListItem>
                </Breadcrumb.List>
              </Breadcrumb.Root>
            ) : (
              <Pane.Title attendableId={attendableId} related={related} classNames={pending && 'text-description'}>
                {label}
              </Pane.Title>
            )}
            {navbarEnd}
            {controls}
          </Pane.Toolbar>
        )}
        <Pane.Content>
          <Surface.Surface
            key={node.id}
            type={AppSurface.Article}
            data={data}
            limit={1}
            fallback={fallback}
            placeholder={placeholder}
          />
        </Pane.Content>
      </Pane.Root>
    );
  },
);

Plank.displayName = 'Plank';
