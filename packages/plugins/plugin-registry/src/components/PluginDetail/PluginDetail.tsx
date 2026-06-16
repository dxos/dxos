//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type Plugin, type PluginManager, type Registry } from '@dxos/app-framework';
import {
  Button,
  Carousel,
  Icon,
  Input,
  Link,
  ScrollArea,
  Select,
  Tag,
  ThemedClassName,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { MarkdownView } from '@dxos/react-ui-markdown';
import { getStyles, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { PluginFailureBadge } from '../PluginFailureBadge';

export type PluginDetailProps = {
  plugin: Plugin.Plugin;
  enabled?: boolean;
  /** True while an in-flight install is running. Disables the install button. */
  installing?: boolean;
  /** True while an in-flight update is running. Disables the update button. */
  updating?: boolean;
  /** True when the catalog has a newer version than the one installed. */
  hasUpdate?: boolean;
  /** Currently installed version tag (used to mark the matching select option). */
  installedVersionTag?: string;
  /** Currently selected version tag in the picker. */
  selectedVersionTag?: string;
  /** Available versions of this plugin from the catalog. When non-empty, a version picker is shown. */
  versions?: readonly Registry.PluginVersion[];
  /**
   * Ids of plugins this plugin declares as dependencies (direct only). Rendered
   * under a "Requires" heading so the user can see what enabling this plugin
   * will auto-enable.
   */
  dependencies?: readonly string[];
  /**
   * Ids of plugins that declare this plugin as a dependency (direct only).
   * Rendered under a "Required by" heading so the user understands the
   * downstream impact of disabling this plugin.
   */
  dependents?: readonly string[];
  /**
   * Failure record for this plugin, if any. When present a warning badge is
   * rendered next to the plugin name in the header.
   */
  failure?: PluginManager.PluginFailure;
  onEnabledChange?: (enabled: boolean) => void;
  /**
   * When provided, the plugin is not installed and an Install button is shown
   * in place of the enable Switch.
   */
  onInstall?: () => void;
  /**
   * Called when the user clicks Install on the version picker.
   */
  onInstallVersion?: () => void;
  /**
   * Called when the user activates a dependency / dependent chip. When
   * provided, chips are rendered as buttons that fire this handler with the
   * target plugin id; when omitted, chips are non-interactive labels.
   */
  onNavigateToPlugin?: (pluginId: string) => void;
  /**
   * Called when the user activates the in-app spec viewer link. When provided
   * (i.e. the plugin bundles its MDL via `Plugin.Meta.specContent`), a second
   * "View specification" link is rendered next to the external spec link.
   */
  onOpenSpec?: () => void;
  /**
   * Resolves a plugin id to its display name for dependency / dependent
   * chip labels. The component delegates the lookup to the parent so each
   * surface can decide how to source names (e.g. `Plugin.Meta.name` from the
   * registered plugin set). When omitted, chips render the raw id.
   */
  onResolvePluginName?: (pluginId: string) => string;
  /**
   * When provided, an Uninstall button is rendered. Leave undefined for core
   * or non-removable plugins.
   */
  onUninstall?: () => void;
  /**
   * When provided and the plugin is installed with a newer catalog version available,
   * an Update button is shown in place of the enable Switch.
   */
  onUpdate?: () => void;
  /**
   * Called when the user selects a different version in the picker.
   */
  onVersionChange?: (tag: string) => void;
};

export const PluginDetail = composable<HTMLDivElement, PluginDetailProps>(
  (
    {
      plugin,
      enabled,
      installing,
      updating,
      hasUpdate,
      installedVersionTag,
      selectedVersionTag,
      versions,
      dependencies,
      dependents,
      failure,
      onEnabledChange,
      onInstall,
      onInstallVersion,
      onNavigateToPlugin,
      onOpenSpec,
      onResolvePluginName,
      onUninstall,
      onUpdate,
      onVersionChange,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const {
      id,
      name,
      author,
      description,
      homePage,
      source,
      screenshots,
      icon = 'ph--circle--regular',
      iconHue = 'neutral',
    } = plugin.meta;
    const styles = getStyles(iconHue);

    // A screenshot entry is either a URL string or a `{ light?, dark? }` record of theme variants.
    // Resolve each to the URL matching the active theme, falling back to the other variant.
    const resolvedScreenshots = (screenshots ?? [])
      .map((entry) =>
        typeof entry === 'string' ? entry : themeMode === 'dark' ? (entry.dark ?? entry.light) : (entry.light ?? entry.dark),
      )
      .filter((url): url is string => typeof url === 'string' && url.length > 0);

    return (
      <ScrollArea.Root {...composableProps(props)} orientation='vertical' ref={forwardedRef}>
        <ScrollArea.Viewport>
          {/*
           * 3-column grid: [icon/prev | content/viewport | next].
           * Most sections occupy `col-start-2 col-span-2` so they stretch from
           * the centre column out to the trailing edge. The carousel uses
           * `display: contents` to flatten its children into this grid so
           * `Carousel.Previous` lands in col 1, `Carousel.Viewport` aligns
           * with the rest of the content in col 2, and `Carousel.Next` sits
           * in col 3.
           */}
          <div className='dx-document grid grid-cols-[4rem_minmax(0,1fr)_4rem] gap-x-4 p-4 items-start'>
            <Icon classNames={mx('row-start-1 p-1 rounded-md', styles.bg, styles.fg)} icon={icon} size={14} />

            <div className='row-start-1 col-start-2 col-span-2 grid grid-cols-[1fr_min-content] gap-x-3 w-full pt-1'>
              <div className='flex items-center gap-2'>
                <h2 className='text-xl'>{name}</h2>
                {failure && <PluginFailureBadge failure={failure} size={5} />}
              </div>
              {onInstall ? (
                <Button density='md' variant='primary' disabled={installing} onClick={onInstall}>
                  {installing ? t('installing.label') : t('install.label')}
                </Button>
              ) : (
                <Input.Root>
                  <Input.Switch classNames='self-center' checked={enabled} onCheckedChange={onEnabledChange} />
                </Input.Root>
              )}
              <div className='flex items-center gap-1 pt-0.5 text-sm text-description'>
                {id}
                {author && <span className='dx-tag dx-tag--info'>{author}</span>}
              </div>
            </div>

            {description && (
              <Section.Root>
                <Section.Heading title={t('description.label')} />
                <Section.Body>
                  <MarkdownView classNames='text-description' content={description} />
                </Section.Body>
              </Section.Root>
            )}

            {resolvedScreenshots.length > 0 && (
              <Section.Root>
                <Section.Heading title={t('preview.label')} />
                <Section.Body>
                  <Carousel.Root count={resolvedScreenshots.length}>
                    <Carousel.Content classNames='contents'>
                      <Carousel.Viewport>
                        {resolvedScreenshots.map((src, index) => (
                          <Carousel.Slide key={src} index={index} src={src} alt={name} />
                        ))}
                      </Carousel.Viewport>
                      <Carousel.Indicators />
                    </Carousel.Content>
                  </Carousel.Root>
                </Section.Body>
              </Section.Root>
            )}

            <Section.Root>
              <Section.Heading title={t('resources.label')} />
              <Section.Body>
                <div className='flex gap-3 items-center'>
                  {homePage && (
                    <Link href={homePage} classNames='text-sm text-description'>
                      {t('home-page.label')}
                      <Icon icon='ph--arrow-square-out--regular' size={3} classNames='ml-1 dx-icon-inline' />
                    </Link>
                  )}

                  {source && (
                    <Link href={source} classNames='text-sm text-description'>
                      {t('source.label')}
                      <Icon icon='ph--arrow-square-out--regular' size={3} classNames='ml-1 dx-icon-inline' />
                    </Link>
                  )}

                  {onOpenSpec && <Chip id={id} name={t('open-spec.label')} onClick={onOpenSpec} />}
                </div>
              </Section.Body>
            </Section.Root>

            {dependencies && dependencies.length > 0 && (
              <Section.Root>
                <Section.Heading title={t('dependencies.label')} />
                <Section.Body>
                  <div className='flex flex-wrap gap-1'>
                    {dependencies.map((depId) => (
                      <Chip
                        key={depId}
                        id={depId}
                        name={onResolvePluginName?.(depId) ?? depId}
                        onClick={onNavigateToPlugin}
                      />
                    ))}
                  </div>
                </Section.Body>
              </Section.Root>
            )}

            {dependents && dependents.length > 0 && (
              <Section.Root>
                <Section.Heading title={t('dependents.label')} />
                <Section.Body>
                  <div className='flex flex-wrap gap-1'>
                    {dependents.map((dependentId) => (
                      <Chip
                        key={dependentId}
                        id={dependentId}
                        name={onResolvePluginName?.(dependentId) ?? dependentId}
                        onClick={onNavigateToPlugin}
                      />
                    ))}
                  </div>
                </Section.Body>
              </Section.Root>
            )}

            {versions && versions.length > 0 && (
              <Section.Root>
                <Section.Heading title={t('versions.label')} />
                <Section.Body>
                  <div className='flex gap-2 items-center'>
                    <Select.Root value={selectedVersionTag} onValueChange={onVersionChange}>
                      <Select.TriggerButton classNames='min-w-32' />
                      <Select.Portal>
                        <Select.Content>
                          <Select.Viewport>
                            {versions.map((versionEntry) => (
                              <Select.Option key={versionEntry.tag} value={versionEntry.tag}>
                                {versionEntry.tag}
                                {installedVersionTag === versionEntry.tag ? ` (${t('installed.label')})` : ''}
                              </Select.Option>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                    {onInstallVersion && (
                      <Button
                        density='md'
                        variant='primary'
                        disabled={installing || selectedVersionTag === installedVersionTag}
                        onClick={onInstallVersion}
                      >
                        {installing ? t('installing.label') : t('install-version.label')}
                      </Button>
                    )}
                  </div>
                </Section.Body>
              </Section.Root>
            )}

            {(onUninstall || (hasUpdate && onUpdate) || updating) && (
              <div className='col-start-2 col-span-2 flex gap-2'>
                {updating ? (
                  <Button variant='primary' disabled>
                    {t('updating.label')}
                  </Button>
                ) : hasUpdate && onUpdate ? (
                  <Button variant='primary' onClick={onUpdate}>
                    {t('update.label')}
                  </Button>
                ) : null}
                {onUninstall && <Button onClick={onUninstall}>{t('uninstall.label')}</Button>}
              </div>
            )}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

PluginDetail.displayName = 'PluginDetail';

const SectionRoot = ({ children }: PropsWithChildren<{}>) => <>{children}</>;

const SectionHeading = ({ title }: { title: string }) => (
  <h2 className='col-start-2 col-span-2 pt-6 pb-2 uppercase text-sm font-medium text-subdued'>{title}</h2>
);

const SectionBody = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div className={mx('col-start-2 flex flex-col gap-2', classNames)}>{children}</div>
);

const Section = {
  Root: SectionRoot,
  Heading: SectionHeading,
  Body: SectionBody,
};

const Chip = ({ id, name, onClick }: { id: string; name: string; onClick?: (pluginId: string) => void }) => (
  <Tag title={id} onClick={onClick ? () => onClick(id) : undefined} classNames='dx-hover'>
    {name}
  </Tag>
);
