//
// Copyright 2026 DXOS.org
//

import React, {
  type ComponentProps,
  Fragment,
  type KeyboardEventHandler,
  type ReactNode,
  type RefObject,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as AttentionSigil from '@dxos/app-toolkit/AttentionSigil';
import { useComposedRefs } from '@dxos/react-hooks';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import * as Breadcrumb from '@dxos/react-ui/Breadcrumb';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Main from '@dxos/react-ui/Main';
import * as Popover from '@dxos/react-ui/Popover';
import * as Theme from '@dxos/react-ui/Theme';
import type * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';

import { Pane } from '../Pane/index.ts';
import { PlankLoading } from './PlankLoading.tsx';

/** A plank waiting: for the node the URL names, and then for that node's article to load. */
const PLANK_LOADING = <PlankLoading />;

/**
 * How long a plank waits before it admits to waiting. A node that resolves inside this never shows a
 * placeholder icon or a loading title at all, so the common case reads as an instant open.
 */
const PENDING_DELAY = '1s';
const pendingStyle = { animationDelay: PENDING_DELAY, animationFillMode: 'backwards' } as const;

type SurfaceProps = ComponentProps<typeof Surface.Surface>;

/**
 * What a plank renders: its identity plus whatever chrome it can offer. A plank the URL names but
 * nothing has resolved yet has only an id, which is why this is not a graph node.
 */
export type PlankSubject = Pick<AppGraphNode.Node, 'id'> & Partial<Pick<AppGraphNode.Node, 'properties' | 'data'>>;

export type PlankProps = Util.ThemedClassName<{
  node: PlankSubject;
  /** Attendable id; defaults to the node id. */
  attendableId?: string;
  /** Grouped sigil menu actions; when present the sigil opens a menu, otherwise it is a plain button. */
  actions?: AttentionSigil.Action[][];
  onAction?: (action: AttentionSigil.Action) => void;
  /**
   * Navigation-history trail rendered before the title (flat mode); clicking one goes back to it. Present (even
   * empty) means the title renders as the trail's current crumb, so it keeps its size and place as the trail grows.
   */
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
      headless,
      onKeyDown,
    },
    forwardedRef,
  ) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const attentionAttrs = useAttentionAttributes(attendableId);
    // Each plank is a focus area of the shell; its companion follows it.
    const landmark = Main.useMainLandmark(1, onKeyDown);
    const ref = useComposedRefs<HTMLDivElement>(forwardedRef, landmark.ref);
    const unresolved = node.data === undefined;

    // The stand-in a pending plank shows stays up after the node resolves, over the article, until that article has
    // rendered: the reader sees one view become the other rather than the plank empty between them.
    const [standIn, setStandIn] = useState<string | undefined>(unresolved ? node.id : undefined);
    if (unresolved && standIn !== node.id) {
      setStandIn(node.id);
    }
    const releaseStandIn = useCallback(() => setStandIn(undefined), []);
    const articleLoading = useRef(false);
    useLayoutEffect(() => {
      // An article that rendered without loading anything never mounted its placeholder to release the stand-in.
      if (!unresolved && standIn !== undefined && !articleLoading.current) {
        setStandIn(undefined);
      }
    });

    // A stand-in that knows the object titles the plank, so the heading does not change when the article arrives.
    const [pendingHeading, setPendingHeading] = useState<AppSurface.PendingHeading>();
    const heading = unresolved ? pendingHeading : undefined;
    const waiting = pending && !heading;
    const icon = node.properties?.icon ?? heading?.icon ?? 'ph--circle-dashed--regular';
    // A bare string is taken verbatim by `toLocalizedString`; only the tuple form is looked up.
    const label = Theme.toLocalizedString(
      node.properties?.label ??
        heading?.label ??
        (pending ? (['pending.heading', { ns: meta.profile.key }] as const) : ''),
      t,
    );
    const data = useMemo<AppSurface.ArticleData>(
      () => ({
        attendableId,
        nodeId: node.id,
        subject: node.data,
        properties: node.properties,
        popoverAnchorId,
        ...articleData,
      }),
      [attendableId, node.id, node.data, node.properties, popoverAnchorId, articleData],
    );

    // Anchor the sigil's popover only when this plank's menu is the active popover target.
    const ActionRoot = popoverAnchorId === `${meta.profile.key}:${node.id}` ? Popover.Anchor : Fragment;

    return (
      <Pane.Root {...landmark} ref={ref} classNames={classNames} {...attentionAttrs} data-testid='deck.plank'>
        {!headless && (
          <Pane.Toolbar>
            <ActionRoot>
              {actions && actions.length > 0 ? (
                <AttentionSigil.Root
                  icon={icon}
                  related={related}
                  attendableId={attendableId}
                  actions={actions}
                  onAction={onAction}
                  triggerLabel={label}
                >
                  {sigilFooter}
                </AttentionSigil.Root>
              ) : (
                <Pane.Sigil
                  attendableId={attendableId}
                  classNames={waiting && 'animate-fade-in'}
                  style={waiting ? pendingStyle : undefined}
                >
                  <span className='sr-only'>{label}</span>
                  <Icon.Icon icon={icon} />
                </Pane.Sigil>
              )}
            </ActionRoot>
            {breadcrumbs ? (
              // Flat mode: the navigation history plus the current plank as one Breadcrumb, at every depth, so the
              // title does not change size or place as a trail appears. The md scope holds the crumbs to the title's
              // text size rather than the header's lg. The trail scrolls horizontally when it overflows.
              <Breadcrumb.Root aria-label={t('breadcrumbs.label')} classNames='dx-scope ps-0.5 grow' data-size='md'>
                <Breadcrumb.List classNames='gap-0'>
                  {breadcrumbs.map((crumb) => (
                    <Fragment key={crumb.id}>
                      <Breadcrumb.Item>
                        <Breadcrumb.Link asChild>
                          <button type='button' onClick={() => onSelectBreadcrumb?.(crumb.id)}>
                            {crumb.label}
                          </button>
                        </Breadcrumb.Link>
                      </Breadcrumb.Item>
                      <Breadcrumb.Separator />
                    </Fragment>
                  ))}
                  <Breadcrumb.Item>
                    {/* The crumb's own inset and weight rather than the title's, so a crumb keeps its size and place
                        as it becomes (or stops being) the current page. */}
                    <Breadcrumb.Current asChild>
                      <Pane.Title
                        attendableId={attendableId}
                        related={related}
                        classNames={[waiting && 'text-fg-muted', 'w-auto grow-0 px-(--dx-control-inset) font-normal']}
                      >
                        {label}
                      </Pane.Title>
                    </Breadcrumb.Current>
                  </Breadcrumb.Item>
                </Breadcrumb.List>
              </Breadcrumb.Root>
            ) : (
              <Pane.Title
                attendableId={attendableId}
                related={related}
                classNames={waiting && ['text-fg-muted', 'animate-fade-in']}
                style={waiting ? pendingStyle : undefined}
              >
                {label}
              </Pane.Title>
            )}
            {navbarEnd}
            {controls}
          </Pane.Toolbar>
        )}
        <Pane.Content classNames={standIn !== undefined && 'relative'}>
          {!unresolved && (
            <Surface.Surface
              key={node.id}
              type={AppSurface.Article}
              data={data}
              limit={1}
              fallback={fallback}
              placeholder={
                standIn === undefined ? (
                  PLANK_LOADING
                ) : (
                  <ArticleLoading loading={articleLoading} onLoaded={releaseStandIn} />
                )
              }
            />
          )}
          {standIn !== undefined && (
            // A plank with no subject: the URL named it and nothing has resolved it yet, so there is
            // no Article to ask for. A plugin that knows something about the id may stand in; the
            // same empty shell shows otherwise, so the plank does not change under the reader.
            <AppSurface.PendingHeadingProvider value={setPendingHeading}>
              <PlankPending classNames={!unresolved && 'dx-cover'} attendableId={attendableId} nodeId={standIn} />
            </AppSurface.PendingHeadingProvider>
          )}
        </Pane.Content>
      </Pane.Root>
    );
  },
);

Plank.displayName = 'Plank';

/** The shell {@link PLANK_LOADING} draws, holding whatever the pending-article role offers for the node. */
const PlankPending = ({ classNames, attendableId, nodeId }: Util.ThemedClassName<AppSurface.PendingArticleData>) => {
  const data = useMemo<AppSurface.PendingArticleData>(() => ({ attendableId, nodeId }), [attendableId, nodeId]);
  return (
    <Layout.Flex column classNames={['dx-attention-surface', classNames]}>
      <Surface.Surface type={AppSurface.PendingArticle} data={data} limit={1} placeholder={null} />
    </Layout.Flex>
  );
};

/**
 * The article's placeholder while a stand-in covers it: renders nothing, and lets the stand-in go once the article
 * replaces it.
 */
const ArticleLoading = ({ loading, onLoaded }: { loading: RefObject<boolean>; onLoaded: () => void }) => {
  useLayoutEffect(() => {
    loading.current = true;
    return () => {
      loading.current = false;
      // Deferred, since a remount (React's development double-mount) runs this before mounting it again.
      queueMicrotask(() => {
        if (!loading.current) {
          onLoaded();
        }
      });
    };
  }, [loading, onLoaded]);
  return null;
};
