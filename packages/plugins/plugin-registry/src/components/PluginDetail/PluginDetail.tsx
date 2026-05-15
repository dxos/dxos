//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Registry, type Plugin, type PluginManager } from '@dxos/app-framework';
import { Button, Icon, Input, Link, ScrollArea, Select, useTranslation } from '@dxos/react-ui';
import { composable, composableProps, getStyles, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { PluginFailureBadge } from '../PluginFailureBadge';

export type PluginDetailProps = {
  plugin: Plugin.Plugin;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  /**
   * When provided, an Uninstall button is rendered. Leave undefined for core
   * or non-removable plugins.
   */
  onUninstall?: () => void;
  /**
   * When provided, the plugin is not installed and an Install button is shown
   * in place of the enable Switch.
   */
  onInstall?: () => void;
  installing?: boolean;
  /**
   * When provided and the plugin is installed with a newer catalog version available,
   * an Update button is shown in place of the enable Switch.
   */
  onUpdate?: () => void;
  /** True when the catalog has a newer version than the one installed. */
  hasUpdate?: boolean;
  /** True while an in-flight update is running. Forces the Update button disabled state. */
  updating?: boolean;
  /** Available versions of this plugin from the catalog. When non-empty, a version picker is shown. */
  versions?: readonly Registry.PluginVersion[];
  /** Currently selected version tag in the picker. */
  selectedVersionTag?: string;
  /** Called when the user selects a different version in the picker. */
  onVersionChange?: (tag: string) => void;
  /** Called when the user clicks Install on the version picker. */
  onInstallVersion?: () => void;
  /** Currently installed version tag (used to mark the matching select option). */
  installedVersionTag?: string;
  /**
   * Failure record for this plugin, if any. When present a warning badge is
   * rendered next to the plugin name in the header.
   */
  failure?: PluginManager.PluginFailure;
  /**
   * Plugins this plugin declares as dependencies (direct only). Rendered
   * under a "Requires" heading so the user can see what enabling this plugin
   * will auto-enable.
   */
  dependencies?: readonly PluginRef[];
  /**
   * Plugins that declare this plugin as a dependency (direct only).
   * Rendered under a "Required by" heading so the user understands the
   * downstream impact of disabling this plugin.
   */
  dependents?: readonly PluginRef[];
  /**
   * Called when the user activates a dependency / dependent chip. When
   * provided, chips are rendered as buttons that fire this handler with the
   * target plugin id; when omitted, chips are non-interactive labels.
   */
  onNavigateToPlugin?: (pluginId: string) => void;
};

/**
 * Resolved {id, name} pair for a related plugin. `name` is the human-readable
 * display string (from `Plugin.Meta.name` or the registry catalog entry); `id`
 * is the canonical plugin id used for navigation and as a fallback when no
 * name is available.
 */
export type PluginRef = { id: string; name: string };

export const PluginDetail = composable<HTMLDivElement, PluginDetailProps>(
  (
    {
      plugin,
      enabled,
      onEnabledChange,
      onUninstall,
      onInstall,
      installing,
      onUpdate,
      hasUpdate,
      updating,
      versions,
      selectedVersionTag,
      onVersionChange,
      onInstallVersion,
      installedVersionTag,
      failure,
      dependencies,
      dependents,
      onNavigateToPlugin,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.id);
    const {
      id,
      name,
      description,
      homePage,
      source,
      screenshots,
      icon = 'ph--circle--regular',
      iconHue = 'neutral',
    } = plugin.meta;
    const styles = getStyles(iconHue);

    return (
      <ScrollArea.Root {...composableProps(props)} orientation='vertical' ref={forwardedRef}>
        <ScrollArea.Viewport>
          <div className='dx-document grid grid-cols-[min-content_1fr] gap-4 p-4'>
            <div>
              <Icon classNames={mx('p-1 rounded-md', styles.fill, styles.foreground)} icon={icon} size={14} />
            </div>
            <div className='flex flex-col gap-6'>
              <div className='grid grid-cols-[1fr_min-content] gap-x-3 w-full pt-1'>
                <div className='flex items-center gap-2'>
                  <h2 className='text-xl'>{name}</h2>
                  {failure && <PluginFailureBadge failure={failure} size={5} />}
                </div>
                {onInstall ? (
                  <Button density='fine' variant='primary' disabled={installing} onClick={onInstall}>
                    {installing ? t('installing.label') : t('install.label')}
                  </Button>
                ) : (
                  <Input.Root>
                    <Input.Switch classNames='self-center' checked={enabled} onCheckedChange={onEnabledChange} />
                  </Input.Root>
                )}
                <p className='pt-0.5 text-sm text-description'>{id}</p>
              </div>
              <div>
                <p className='text-description'>{description}</p>
              </div>
              {screenshots && screenshots.length > 0 && (
                <div className='flex flex-col gap-2'>
                  <h2>Preview</h2>
                  <img src={screenshots[0]} alt={name} className='aspect-video object-fit' />
                </div>
              )}
              <div className='flex flex-col gap-2'>
                <h2>Resources</h2>
                <div className='flex gap-2'>
                  {homePage && (
                    <Link href={homePage} target='_blank' rel='noreferrer' classNames='text-sm text-description'>
                      {t('home-page.label')}
                      <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mx-1' />
                    </Link>
                  )}

                  {source && (
                    <Link href={source} target='_blank' rel='noreferrer' classNames='text-sm text-description'>
                      {t('source.label')}
                      <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mx-1' />
                    </Link>
                  )}
                </div>
              </div>
              {((dependencies && dependencies.length > 0) || (dependents && dependents.length > 0)) && (
                <div className='flex flex-col gap-2'>
                  {dependencies && dependencies.length > 0 && (
                    <>
                      <h2>{t('dependencies.label')}</h2>
                      <div className='flex flex-wrap gap-1'>
                        {dependencies.map((dep) => (
                          <PluginChip key={dep.id} pluginRef={dep} onClick={onNavigateToPlugin} />
                        ))}
                      </div>
                    </>
                  )}
                  {dependents && dependents.length > 0 && (
                    <>
                      <h2>{t('dependents.label')}</h2>
                      <div className='flex flex-wrap gap-1'>
                        {dependents.map((dependent) => (
                          <PluginChip key={dependent.id} pluginRef={dependent} onClick={onNavigateToPlugin} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {versions && versions.length > 0 && (
                <div className='flex flex-col gap-2'>
                  <h2>{t('versions.label')}</h2>
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
                        density='fine'
                        variant='primary'
                        disabled={installing || selectedVersionTag === installedVersionTag}
                        onClick={onInstallVersion}
                      >
                        {installing ? t('installing.label') : t('install-version.label')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {(onUninstall || (hasUpdate && onUpdate) || updating) && (
                <div className='flex gap-2'>
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
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

PluginDetail.displayName = 'PluginDetail';

/**
 * Renders a single dependency / dependent reference as either a clickable
 * button (when `onClick` is provided) or a passive label. The plugin id is
 * surfaced via `title` so the canonical id stays one hover away even when the
 * chip shows the friendlier `name`.
 */
const PluginChip = ({ pluginRef, onClick }: { pluginRef: PluginRef; onClick?: (pluginId: string) => void }) => {
  const baseClass = 'rounded-md px-2 py-0.5 text-xs bg-modalSurface text-description';
  if (onClick) {
    return (
      <button
        type='button'
        title={pluginRef.id}
        className={mx(baseClass, 'hover:underline focus-visible:underline cursor-pointer')}
        onClick={() => onClick(pluginRef.id)}
      >
        {pluginRef.name}
      </button>
    );
  }
  return (
    <span title={pluginRef.id} className={baseClass}>
      {pluginRef.name}
    </span>
  );
};
