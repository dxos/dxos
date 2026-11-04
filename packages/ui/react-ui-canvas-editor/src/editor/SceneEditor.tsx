//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, {
  Fragment,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { keyTimes, timelineFps } from '@dxos/animation';
import { TimelineBar } from '@dxos/react-ui-animation';
import {
  type ActiveTool,
  CREATE_GROUP,
  FLOATING_BAR,
  SceneContextMenu,
  type ToolGroup,
  TOOLS_GROUP,
} from '@dxos/react-ui-canvas';
import * as Button from '@dxos/react-ui/Button';
import * as Menu from '@dxos/react-ui/Menu';
import * as Popover from '@dxos/react-ui/Popover';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { findLayout } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import {
  CameraToolbar,
  DisplayPanel,
  InspectorPanel,
  NavigationToolbar,
  ReadonlyToggle,
  ToolRail,
} from '../components/index.ts';
import {
  type SceneEditorHostProps,
  type SceneEditorLatest,
  SceneEditorServicesProvider,
  SceneLookProvider,
  ZOOM_STEP,
  createSceneEditorServices,
  drawnGrid,
  editsInRole,
  useEditorLook,
  useSceneCommands,
  useSceneDocument,
  useSceneLook,
  useSceneNavigation,
  useSceneSelection,
  useSceneServices,
  useSceneTime,
  useSceneTools,
} from './aspects/index.ts';
import { type Command, SHARED_COMMANDS } from './commands.ts';
import { type DimensionConfig, type LibraryItem, type ToolCategory, type ToolDef } from './config.ts';
import { SceneEditorInspector } from './sections.tsx';
import { keySelection, placementFields } from './timeline.ts';

/** The rail's group for each tool category, as 2D's rail names them. */
const CATEGORY_GROUPS: Readonly<Record<ToolCategory, string>> = {
  select: TOOLS_GROUP,
  transform: 'Transform',
  create: CREATE_GROUP,
};

/** A new shot's length, in seconds, before the animator changes it. */
const DEFAULT_SHOT_SECONDS = 5;

export type SceneEditorRootProps<C> = PropsWithChildren<
  SceneEditorHostProps<C> & {
    config: DimensionConfig<C>;
    /**
     * A picture (a card, section or slide) shows its breadcrumbs and zoom bar, which move its view alone (an embed the
     * user attends).
     */
    navigable?: boolean;
    /** A new key frames the open layout's content (an agent's edit asks for it), even after the viewer moved the camera. */
    refitKey?: string | number;
    docked?: boolean;
    onDockedChange?: (docked: boolean) => void;
    /** The inspector panel's actions, a hook called inside the dimension's root so it can read the dimension's engine. */
    useInspectorActions?: () => ReactNode;
  }
>;

/**
 * The shared scene editor (decision 2): the services for the config's dimension, built once, behind one hook per aspect
 * (COMMON-CORE Expectation 0). In a card, section or slide it draws the viewport alone, as a picture, under its
 * breadcrumbs and zoom bar when `navigable`.
 */
const SceneEditorRoot = <C,>({
  config,
  navigable = false,
  refitKey,
  docked = false,
  onDockedChange,
  useInspectorActions,
  children,
  ...props
}: SceneEditorRootProps<C>) => {
  const registry = useContext(RegistryContext);
  const look = useEditorLook(config.display, props.display, props.onDisplayChange);
  const latest = useRef<SceneEditorLatest<C>>({ props, display: look.display });
  latest.current = { props, display: look.display };
  // A scene of another layout is another engine's view in 2D, so its aspects are built afresh.
  const root = props.document.scenes.find((record) => record.id === props.scene)?.layout;
  const { services, sync } = useMemo(
    () => createSceneEditorServices(registry, config, latest),
    [registry, config, root],
  );
  useLayoutEffect(sync);

  const refit = useRef(refitKey);
  useEffect(() => {
    if (refit.current !== refitKey) {
      refit.current = refitKey;
      services.navigation.commands.fit();
    }
  }, [refitKey, services]);

  const readonly = (props.readonly ?? false) || !editsInRole(props.role);
  const { Root, Viewport, shortcuts = true } = services;
  return (
    <SceneEditorServicesProvider {...services}>
      <SceneLookProvider {...look}>
        {editsInRole(props.role) ? (
          <InspectorPanel.Root
            docked={!readonly && docked}
            readonly={readonly}
            useActions={useInspectorActions ?? useSelectionActions}
            onDockedChange={onDockedChange}
          >
            {shortcuts && <EditorShortcuts />}
            <Root Frame={InspectorPanel.Frame}>{children}</Root>
          </InspectorPanel.Root>
        ) : (
          <Root>
            <Viewport>
              {navigable ? (
                <>
                  <SceneEditorNavigation />
                  <SceneEditorCamera />
                </>
              ) : null}
            </Viewport>
          </Root>
        )}
      </SceneLookProvider>
    </SceneEditorServicesProvider>
  );
};

SceneEditorRoot.displayName = 'SceneEditor.Root';

/**
 * The editor's command shortcuts, on the whole window while the last press was inside the editor, so they still work
 * once a clicked control drops focus to the page; typing in a field keeps its own keys.
 */
const EditorShortcuts = () => {
  const { registry, commands } = useSceneServices('SceneEditor.Shortcuts');
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  // Outside the effect: a press's own drag must not forget it.
  const inside = useRef(false);
  useEffect(() => {
    const element = frame?.parentElement;
    if (!element) {
      return;
    }
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    // Focusable without joining the tab order, so a press on a viewport that takes no focus of its own still moves the
    // keyboard here, in either dimension.
    element.hasAttribute('tabindex') || element.setAttribute('tabindex', '-1');
    const onPointerDown = (event: PointerEvent) => {
      inside.current = event.target instanceof Node && element.contains(event.target);
      const focus = globalThis.document.activeElement;
      inside.current &&
        !typing(event.target) &&
        !(focus instanceof Node && element.contains(focus)) &&
        element.focus({ preventScroll: true });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const focus = globalThis.document.activeElement;
      if (
        !inside.current ||
        typing(event.target) ||
        !(focus === null || focus === globalThis.document.body || element.contains(focus))
      ) {
        return;
      }
      // Delete is the viewport's own (it knows a face from an element); the chorded commands are the table's.
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      const command = registry.get(commands.atoms.table).keyCommand(event);
      if (command) {
        event.preventDefault();
        command.run();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [frame, registry, commands]);
  return <span ref={setFrame} hidden />;
};

/** The dimension's viewport, framed with the inspector panel; its children are the floating panels drawn over it. */
const SceneEditorViewport = ({ children }: PropsWithChildren) => {
  const { Viewport } = useSceneServices('SceneEditor.Viewport');
  return <Viewport>{children}</Viewport>;
};

SceneEditorViewport.displayName = 'SceneEditor.Viewport';

/**
 * Where the view is in the scene's frames: Up and the drill path as breadcrumbs, the scene's own layout first (as home).
 * A crumb drills out to its level, and home at the scene's own layout frames the view; drilling in is the viewport's (a
 * double-click, or zooming until a frame fills it).
 */
const SceneEditorNavigation = ({ classNames = 'top-2 left-2' }: { classNames?: string }) => {
  const { atoms } = useSceneDocument('SceneEditor.Navigation');
  const navigation = useSceneNavigation('SceneEditor.Navigation');
  const document = useAtomValue(atoms.document);
  const scene = useAtomValue(atoms.scene);
  const rootLayout = useAtomValue(atoms.rootLayout);
  const drilled = useAtomValue(navigation.atoms.path);
  const path = useMemo(() => (drilled.length > 0 ? drilled : rootLayout ? [rootLayout] : []), [drilled, rootLayout]);
  const { open, fit } = navigation.commands;
  const actions = useMemo(
    () => ({
      path: [...path],
      // The root is the scene, so it reads as the scene's name; a frame's layout by its own.
      nameOf: (id: string) =>
        (id === rootLayout ? document.scenes.find((record) => record.id === scene)?.name : undefined) ??
        findLayout(document, id)?.name ??
        id,
      onPath: (index: number) => (index === path.length - 1 ? fit() : open(path.slice(0, index + 1))),
    }),
    [path, rootLayout, document, scene, open, fit],
  );
  return path.length === 0 ? null : (
    <div className={mx('absolute w-max max-w-[50%]', classNames)}>
      <NavigationToolbar actions={actions} />
    </div>
  );
};

SceneEditorNavigation.displayName = 'SceneEditor.Navigation';

const sameTool = (left: ActiveTool, right: ActiveTool): boolean => left.id === right.id && left.object === right.object;

/** The tool rail, below the breadcrumbs: the config's tools by category; locked, only the select-category tools stay. */
const SceneEditorTools = ({ classNames = 'top-14 bottom-14 left-2' }: { classNames?: string }) => {
  const { config, atoms, commands } = useSceneDocument('SceneEditor.Tools');
  const tools = useSceneTools('SceneEditor.Tools');
  const readonly = useAtomValue(atoms.readonly);
  const { lock } = useAtomValue(atoms.host);
  const tool = useAtomValue(tools.atoms.tool);
  const groups = useMemo<ToolGroup<ActiveTool>[]>(() => {
    // By rail group, in the order the tools first name them.
    const byGroup = new Map<string, { category: ToolCategory; defs: ToolDef[] }>();
    for (const def of config.tools) {
      const name = def.group ?? CATEGORY_GROUPS[def.category];
      if (!readonly || def.category === 'select') {
        const group = byGroup.get(name) ?? { category: def.category, defs: [] };
        byGroup.set(name, { ...group, defs: [...group.defs, def] });
      }
    }
    return [...byGroup.entries()].map(([name, { category, defs }]) => ({
      name,
      collapsible: category === 'create',
      entries: defs.map((def) => ({
        tool: { id: def.id },
        icon: def.icon,
        label: def.label,
        ...(def.key ? { key: def.key } : {}),
        ...(def.fold ? { fold: def.fold } : {}),
      })),
    }));
  }, [config.tools, readonly]);
  // The library ends the create group, or the fixed tools where the dimension offers no create tool.
  const createTool = config.tools.find((def) => def.category === 'create');
  const libraryGroup = createTool ? (createTool.group ?? CATEGORY_GROUPS.create) : TOOLS_GROUP;
  const prefix = config.dim === '3d' ? 'canvas3d' : 'canvas';
  const library =
    !readonly && config.library && config.library.length > 0 ? (
      <LibraryTool items={config.library} prefix={prefix} />
    ) : undefined;
  const dragData = useMemo(() => {
    const { toolDragData } = config;
    if (!toolDragData) {
      return undefined;
    }
    return (tool: ActiveTool) => {
      const def = config.tools.find((candidate) => candidate.id === tool.id);
      return def && toolDragData(def);
    };
  }, [config]);
  return (
    <div className={mx('absolute pointer-events-none', classNames)}>
      <ToolRail
        groups={groups}
        dragData={dragData}
        tool={tool}
        same={sameTool}
        testId={(entry) => `${prefix}.tool.${entry.tool.id}`}
        groupEnd={{
          ...(lock
            ? { [TOOLS_GROUP]: <ReadonlyToggle readonly={readonly} onReadonlyChange={commands.setReadonly} /> }
            : {}),
          ...(library ? { [libraryGroup]: library } : {}),
        }}
        onToolChange={tools.commands.setTool}
      />
    </div>
  );
};

SceneEditorTools.displayName = 'SceneEditor.Tools';

/**
 * The host's library beside the rail: a pick defines the object in the model unless it holds one by that id (defined
 * once, placed many, as an import is), then arms the place tool, so the next click in the view places it.
 */
const LibraryTool = ({ items, prefix }: { items: readonly LibraryItem[]; prefix: string }) => {
  const { atoms, commands } = useSceneDocument('SceneEditor.Library');
  const tools = useSceneTools('SceneEditor.Library');
  const document = useAtomValue(atoms.document);
  const tool = useAtomValue(tools.atoms.tool);
  const [open, setOpen] = useState(false);
  const model = document.models[0];
  const pick = async (item: LibraryItem) => {
    setOpen(false);
    if (!model) {
      return;
    }
    if (model.objects[item.id] === undefined) {
      const object = await item.make();
      const defined =
        object && commands.modelIntent({ kind: 'define', model: model.id, object: { ...object, id: item.id } });
      if (!defined || defined.length > 0) {
        return;
      }
    }
    tools.commands.setTool({ id: 'place', object: item.id });
  };
  const placing = tool.id === 'place' && items.some((item) => item.id === tool.object);
  return (
    <Popover.Root open={open} onOpenChange={({ open }) => setOpen(open)} positioning={{ placement: 'right-start' }}>
      <Popover.Trigger asChild>
        <Button.Toggle
          variant='ghost'
          iconOnly
          icon='ph--package--regular'
          label='Library'
          pressed={placing}
          data-testid={`${prefix}.tool.library`}
        />
      </Popover.Trigger>
      <Popover.Content>
        <div className='flex flex-col items-stretch gap-1 p-1' data-testid={`${prefix}.library`}>
          {items.map((item) => (
            <Button.Root
              key={item.id}
              variant='ghost'
              icon={item.icon ?? 'ph--cube--regular'}
              label={item.label}
              classNames='w-full justify-start'
              data-testid={`${prefix}.library.${item.id}`}
              onClick={() => void pick(item)}
            />
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

/**
 * The actions bar: the command table's commands, with the create menu and the dimension's own commands before undo;
 * locked, it hides, as every one edits the scene but Copy.
 */
const SceneEditorActions = ({ classNames = 'bottom-2 left-1/2 -translate-x-1/2' }: { classNames?: string }) => {
  const { config, atoms } = useSceneDocument('SceneEditor.Actions');
  const readonly = useAtomValue(atoms.readonly);
  const table = useAtomValue(useSceneCommands('SceneEditor.Actions').atoms.table);
  if (readonly) {
    return null;
  }
  const shared = new Set<string>(SHARED_COMMANDS);
  const history = (command: Command) => command.id === 'undo' || command.id === 'redo';
  const creates = config.tools.flatMap((tool) =>
    tool.category === 'create' && tool.kind !== undefined ? [{ id: tool.id, kind: tool.kind, label: tool.label }] : [],
  );
  const own = table.commands.filter((command) => !shared.has(command.id) && command.id !== 'import');
  const groups = [
    <Fragment key='shared'>
      {table.commands
        .filter((command) => shared.has(command.id) && !history(command))
        .map((command) => (
          <CommandButton key={command.id} command={command} />
        ))}
    </Fragment>,
    creates.length > 0 || own.length > 0 ? (
      <Fragment key='own'>
        {creates.length > 0 && <CreateMenu kinds={creates} />}
        {own.map((command) => (
          <CommandButton key={command.id} command={command} />
        ))}
      </Fragment>
    ) : null,
    <Fragment key='history'>
      {table.commands.filter(history).map((command) => (
        <CommandButton key={command.id} command={command} />
      ))}
    </Fragment>,
  ].filter((group) => group !== null);
  return (
    <div className={mx('absolute w-max', classNames)}>
      <Toolbar.Root classNames={mx('w-full', FLOATING_BAR)} data-testid='scene-actions'>
        {groups.map((group, index) => (
          <Fragment key={index}>
            {index > 0 && <Toolbar.Separator variant='line' />}
            {group}
          </Fragment>
        ))}
      </Toolbar.Root>
    </div>
  );
};

/** A command as a button, or a toggle when it has a pressed state. */
const CommandButton = ({ command }: { command: Command }) => {
  const props = {
    'variant': 'ghost' as const,
    'iconOnly': true,
    'icon': command.icon,
    'label': command.shortcut ? `${command.label} (${command.shortcut})` : command.label,
    'disabled': !command.enabled,
    'data-testid': `scene-action-${command.id}`,
  };
  return command.pressed === undefined ? (
    <Button.Root {...props} onClick={command.run} />
  ) : (
    <Button.Toggle {...props} pressed={command.pressed} onPressedChange={command.run} />
  );
};

type SelectionAction = Pick<Command, 'id' | 'label' | 'icon' | 'run'>;

const NO_ACTIONS = Atom.make<readonly SelectionAction[]>([]);

/**
 * The selection's commands at the start of the inspector panel's toolbar: the command table's group and ungroup, then
 * the dimension's own (2D: a class from the selection); none when none applies.
 */
const useSelectionActions = (): ReactNode => {
  const table = useAtomValue(useSceneCommands('SceneEditor.SelectionActions').atoms.table);
  const { inspector } = useSceneServices('SceneEditor.SelectionActions');
  const own = useAtomValue(
    useMemo(
      () =>
        inspector?.selectionCommands
          ? Atom.make((get): readonly SelectionAction[] =>
              (inspector.selectionCommands ?? []).filter((command) => get(command.enabled)),
            )
          : NO_ACTIONS,
      [inspector],
    ),
  );
  const commands: SelectionAction[] = [
    ...(['group', 'ungroup'] as const).flatMap((id) => {
      const command = table.get(id);
      return command?.enabled ? [command] : [];
    }),
    ...own,
  ];
  return commands.length === 0
    ? undefined
    : commands.map((command) => (
        <Button.Root
          key={command.id}
          variant='ghost'
          iconOnly
          icon={command.icon}
          label={command.label}
          data-testid={`inspector-${command.id}`}
          onClick={command.run}
        />
      ));
};

/** The config's create tools: one makes its element in the middle of the view, or picks its tool where it cannot. */
const CreateMenu = ({ kinds }: { kinds: readonly { id: string; kind: string; label: string }[] }) => {
  const { commands } = useSceneTools('SceneEditor.CreateMenu');
  return (
    <Menu.Root positioning={{ placement: 'top', gutter: 4 }}>
      <Menu.Trigger asChild>
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--plus--regular'
          label={commands.create ? 'Create in the middle of the view' : 'Create'}
          data-testid='toolbar-create'
        />
      </Menu.Trigger>
      {/* Portalled: inside the bar's flex flow the items would sit under the canvas. */}
      <Menu.Content>
        {kinds.map((tool) => (
          <Menu.Item
            key={tool.id}
            data-testid={`create-${tool.kind}`}
            item={{ value: tool.id, label: tool.label }}
            onSelect={() => (commands.create ? commands.create(tool.kind) : commands.setTool({ id: tool.id }))}
          />
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};

SceneEditorActions.displayName = 'SceneEditor.Actions';

/** The camera bar: fit and zoom this viewer's view, beside the zoom as a percentage of the authored camera's. */
const SceneEditorCamera = ({ classNames = 'bottom-2 left-2' }: { classNames?: string }) => {
  const { atoms, commands } = useSceneNavigation('SceneEditor.Camera');
  const zoomable = useAtomValue(atoms.zoomable);
  const percent = useAtomValue(atoms.percent);
  const actions = useMemo(
    () => ({
      fit: commands.fit,
      fitting: false,
      zoomReset: commands.actual,
      zoomIn: () => commands.zoomBy(ZOOM_STEP),
      zoomOut: () => commands.zoomBy(1 / ZOOM_STEP),
    }),
    [commands],
  );
  if (!zoomable) {
    return null;
  }
  return (
    <div className={mx('absolute w-max', classNames)}>
      <CameraToolbar actions={actions}>{percent === undefined ? null : `${percent}%`}</CameraToolbar>
    </div>
  );
};

SceneEditorCamera.displayName = 'SceneEditor.Camera';

/** The aids' state for a dimension that draws none of its own. */
const NO_AID = Atom.make(false);

/**
 * The display panel: the look (a default style catalog, as a swatch where the config has a theme registry), the grid,
 * snapping (apart from the grid), 2D's guides and, where the host offers animation, the Timeline panel's toggle.
 */
const SceneEditorDisplay = ({ classNames = 'bottom-2 right-2' }: { classNames?: string }) => {
  const { display, options, setDisplay, setTheme } = useSceneLook('SceneEditor.Display');
  const { config, atoms } = useSceneDocument('SceneEditor.Display');
  const { registry: atomRegistry, aids } = useSceneServices('SceneEditor.Display');
  const time = useSceneTime('SceneEditor.Display');
  const readonly = useAtomValue(atoms.readonly);
  const { animation } = useAtomValue(atoms.host);
  const timeline = useAtomValue(time.atoms.visible);
  // What the engine draws, which its own keys toggle too; the host's display where the dimension has no engine aids.
  const drawn = {
    snap: useAtomValue(aids?.snap ?? NO_AID),
    guides: useAtomValue(aids?.guides ?? NO_AID),
    axes: useAtomValue(aids?.axes ?? NO_AID),
  };
  const lattice = useAtomValue(aids?.lattice ?? NO_AID);
  const snap = aids ? drawn.snap : display.snap;
  const guides = aids ? drawn.guides : display.guides;
  const axes = aids ? drawn.axes : display.axes;
  // The engine's aid is set too, as its own keys may have moved it from the host's value.
  const toggle = (aid: 'snap' | 'guides' | 'axes', value: boolean | undefined) => () => {
    aids && atomRegistry.set(aids[aid], !value);
    setDisplay?.({ [aid]: !value });
  };
  const { registry } = options;
  const themes = useMemo(
    () => options.themes.map(({ id, label, mode }) => ({ id, name: label, ...(mode ? { mode } : {}) })),
    [options],
  );
  return (
    <div className={mx('absolute w-max', classNames)}>
      <DisplayPanel
        readonly={readonly}
        registry={registry}
        theme={
          registry?.themes[display.theme] ??
          themes.find((option) => option.id === display.theme) ??
          themes[0] ?? { id: display.theme, name: display.theme }
        }
        themes={themes}
        override={display.themeOverride}
        onThemeChange={setTheme}
        grid={drawnGrid(options, display)}
        gridOptions={options.grids}
        onGridChange={
          setDisplay &&
          ((grid) =>
            setDisplay(grid === undefined || grid === 'none' ? { grid: false } : { grid: true, gridKind: grid }))
        }
        snap={snap}
        onSnapToggle={setDisplay && toggle('snap', snap)}
        dim={config.dim}
        axes={axes}
        onAxesToggle={setDisplay && toggle('axes', axes)}
        // A lattice's cells are its guides, so only a lattice has any to show.
        guides={options.guides ? guides : undefined}
        onGuidesToggle={options.guides && setDisplay && (!aids || lattice) ? toggle('guides', guides) : undefined}
        lattice={lattice}
        timeline={timeline}
        onTimelineToggle={animation ? () => time.commands.setVisible(!timeline) : undefined}
      />
    </div>
  );
};

SceneEditorDisplay.displayName = 'SceneEditor.Display';

/** The right-click menu: the command table's items over an element or empty space. */
const SceneEditorContextMenu = () => {
  const { atoms, commands } = useSceneCommands('SceneEditor.ContextMenu');
  const menu = useAtomValue(atoms.menu);
  const table = useAtomValue(atoms.table);
  return (
    <SceneContextMenu
      at={menu?.at}
      items={menu ? table.menuItems(menu.kind) : []}
      onCommand={(id) => table.get(id)?.run()}
      onClose={() => commands.setMenu(undefined)}
    />
  );
};

SceneEditorContextMenu.displayName = 'SceneEditor.ContextMenu';

/** The last command's message (a refused paste, a failed import). */
const SceneEditorNotice = () => {
  const notice = useAtomValue(useSceneCommands('SceneEditor.Notice').atoms.notice);
  return notice ? (
    <p
      role='alert'
      className={mx('absolute top-2 left-1/2 -translate-x-1/2 text-sm text-error-text', FLOATING_BAR)}
      data-testid='scene-notice'
    >
      {notice}
    </p>
  ) : null;
};

SceneEditorNotice.displayName = 'SceneEditor.Notice';

/**
 * The Timeline panel (decision 16), shared by both dimensions and hidden until the display panel's toggle shows it: the
 * shots staging the open scene, played and scrubbed by sampling the shot into the viewport (never written), and keyed
 * from the selection's animatable fields into the shot's timeline; with no shot, the first key makes one.
 */
const SceneEditorTimeline = ({ classNames = 'bottom-14 left-1/2 -translate-x-1/2' }: { classNames?: string }) => {
  const { registry } = useSceneServices('SceneEditor.Timeline');
  const { config, atoms } = useSceneDocument('SceneEditor.Timeline');
  const { atoms: timeAtoms, commands } = useSceneTime('SceneEditor.Timeline');
  const document = useAtomValue(atoms.document);
  const layout = useAtomValue(atoms.layout);
  const readonly = useAtomValue(atoms.readonly);
  const { animation } = useAtomValue(atoms.host);
  const selection = useAtomValue(useSceneSelection('SceneEditor.Timeline').atoms.selection);
  const shots = useAtomValue(timeAtoms.shots);
  const shotId = useAtomValue(timeAtoms.shot);
  const time = useAtomValue(timeAtoms.time);
  const playing = useAtomValue(timeAtoms.playing);
  const visible = useAtomValue(timeAtoms.visible);
  const shot = shots?.find((entry) => entry.id === shotId) ?? shots?.[0];
  const timeline = shot?.timeline;
  const duration = timeline?.duration ?? DEFAULT_SHOT_SECONDS;
  const fps = timelineFps(timeline);
  const keys = useMemo(() => keyTimes(timeline, selection), [timeline, selection]);

  // Playback advances the playhead each frame and stops at the end.
  useEffect(() => {
    if (!playing) {
      return;
    }
    let last = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const next = registry.get(timeAtoms.time) + (now - last) / 1000;
      last = now;
      if (next >= duration) {
        commands.setTime(duration);
        commands.setPlaying(false);
        return;
      }
      commands.setTime(next);
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, duration, registry, timeAtoms, commands]);

  if (!visible || !shots || !animation) {
    return null;
  }
  const key = () =>
    layout !== undefined &&
    commands.writeShot(
      shot?.id,
      keySelection({ timeline, document, layout, selection, t: time, fields: config.animatable ?? placementFields }),
    );
  return (
    <div className={mx('absolute w-max max-w-[calc(100%-2rem)] flex gap-1 items-center', classNames)}>
      {shots.length > 1 && (
        <Toolbar.Root classNames={FLOATING_BAR} data-testid='timeline-shots'>
          {shots.map((entry, index) => (
            <Button.Root
              key={entry.id}
              variant={entry.id === shot?.id ? 'primary' : 'ghost'}
              label={entry.name ?? `Shot ${index + 1}`}
              data-testid={`timeline-shot-${entry.id}`}
              onClick={() => commands.setShot(entry.id)}
            />
          ))}
        </Toolbar.Root>
      )}
      <TimelineBar
        classNames={FLOATING_BAR}
        time={time}
        duration={duration}
        playing={playing}
        fps={fps}
        keys={keys}
        readonly={readonly}
        onPlayingChange={(next) => {
          next && time >= duration && commands.setTime(0);
          commands.setPlaying(next);
        }}
        onTimeChange={commands.setTime}
        onAddKey={selection.length > 0 && !readonly ? key : undefined}
      />
    </div>
  );
};

SceneEditorTimeline.displayName = 'SceneEditor.Timeline';

export const SceneEditor = {
  Root: SceneEditorRoot,
  Inspector: SceneEditorInspector,
  Viewport: SceneEditorViewport,
  Navigation: SceneEditorNavigation,
  Tools: SceneEditorTools,
  Actions: SceneEditorActions,
  Camera: SceneEditorCamera,
  Display: SceneEditorDisplay,
  ContextMenu: SceneEditorContextMenu,
  Notice: SceneEditorNotice,
  Timeline: SceneEditorTimeline,
};
