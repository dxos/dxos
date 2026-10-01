//
// Copyright 2026 DXOS.org
//

import { REACT_UI_LIST_NEXT, REACT_UI_NEXT } from './next-exports.ts';

/**
 * The single table of where each current import goes.
 * When the cut-over makes Next the default export, only `MODULES` (and the form `namespace`) change here.
 */

export type PackageName = 'react-ui' | 'react-ui-list' | 'react-ui-form' | 'react-ui-menu';

export type ModuleTarget = {
  /** The current entry. */
  current: string;
  /** The Next entry; absent while the package has none. */
  next?: string;
  /** Names are members of this namespace export of `next` rather than named exports. */
  namespace?: string;
  /** Every name the current entry exports moves to `next` unchanged. */
  moveAll?: boolean;
};

export const MODULES: Record<PackageName, ModuleTarget> = {
  'react-ui': { current: '@dxos/react-ui', next: '@dxos/react-ui/next', namespace: 'Next' },
  'react-ui-list': { current: '@dxos/react-ui-list', next: '@dxos/react-ui-list/next' },
  'react-ui-form': { current: '@dxos/react-ui-form' },
  'react-ui-menu': { current: '@dxos/react-ui-menu', next: '@dxos/react-ui-menu/next', moveAll: true },
};

/** Where one imported name goes. */
export type ImportTarget =
  /** To `name` in `pkg`'s Next entry (a namespace member when the entry has a namespace). */
  | { kind: 'next'; pkg: PackageName; name: string }
  /** Element renames (`IconButton` → `Button`) must run first; the `renames` transform rewrites every use. */
  | { kind: 'renames' }
  /** No Next counterpart; the reason is the residue. */
  | { kind: 'none'; reason: string };

const next = (pkg: PackageName, name: string): ImportTarget => ({ kind: 'next', pkg, name });
const none = (reason: string): ImportTarget => ({ kind: 'none', reason });

const sameName = (pkg: PackageName, names: string[]): Record<string, ImportTarget> =>
  Object.fromEntries(names.map((name) => [name, next(pkg, name)]));

const FORM_PENDING = none('react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2)');

/**
 * Import targets by package and imported name. A name not listed stays on the current entry (hooks, utilities,
 * providers and types that survive the cut-over).
 */
export const IMPORT_TARGETS: Record<PackageName, Record<string, ImportTarget>> = {
  'react-ui': {
    ...sameName('react-ui', [...REACT_UI_NEXT.values, ...REACT_UI_NEXT.types]),
    ButtonGroup: next('react-ui', 'Group'),
    DRAWER_DEFAULT_HEIGHT: next('react-ui', 'MAIN_DRAWER_DEFAULT_HEIGHT'),
    DRAWER_MAX_HEIGHT: next('react-ui', 'MAIN_DRAWER_MAX_HEIGHT'),
    DRAWER_MIN_HEIGHT: next('react-ui', 'MAIN_DRAWER_MIN_HEIGHT'),
    useSidebars: next('react-ui', 'useMainSidebars'),
    IconButton: { kind: 'renames' },
    SystemIconButton: { kind: 'renames' },
    ToggleGroupItem: { kind: 'renames' },
    ToggleGroupIconItem: { kind: 'renames' },
    IconBlock: { kind: 'renames' },
    Container: none('the current Container is a dx-expand div; Next.Container is a grid (restructure by hand)'),
    Calendar: none('no Next Calendar; DateInput covers date entry'),
    Column: none('Column → gutter Container (+ Block rail); restructure by hand'),
    DatePicker: none('DatePicker → Next.DateInput'),
    DensityProvider: none('DensityProvider → `size` on the nearest Container/Panel'),
    Drawer: none('no Next Drawer'),
    ElevationProvider: none('ElevationProvider → `level` on the host'),
    Flex: none('Flex → Container layout / Group; a layout decision'),
    Grid: none('Grid → Container columns; a layout decision'),
    SegmentedDate: none('SegmentedDate → Next.DateInput'),
    SegmentedDateTime: none('SegmentedDateTime → Next.DateInput'),
    SegmentedTime: none('SegmentedTime → Next.DateInput'),
    Syncing: none('no Next Syncing'),
    TextRibbon: none('no Next TextRibbon'),
    ThrowError: none('ThrowError is not ported'),
    Toc: none('no Next Toc'),
    ToggleIconButton: none('ToggleIconButton → Next.Toggle (activeIcon)'),
    useDensityContext: none('Next has no density context; sizes come from CSS scope'),
    useElevationContext: none('Next has no elevation context; levels come from CSS scope'),
    useInColumn: none('Column is not ported'),
    useThemeContext: none('Next has no tx theme context (decision 3)'),
    withColumn: none('Column is not ported'),
  },
  'react-ui-list': {
    ...sameName('react-ui-list', [...REACT_UI_LIST_NEXT.values, ...REACT_UI_LIST_NEXT.types]),
    Combobox: next('react-ui', 'Combobox'),
    DropIndicator: next('react-ui', 'DropIndicator'),
    MasterDetail: none('no Next MasterDetail'),
    Picker: none('Picker → Next.Combobox trigger mode (decision 9)'),
    TREE_BLOCK: none('the Next Tree sizes rows from its scope'),
    createStaticTreeModel: none('the Next Tree is driven by TreeModel atoms; rewrite the model'),
    useListSelection: none('useListSelection → listboxSelection adapter (react-ui-list/next)'),
    useListboxSelection: none('Ark owns Listbox selection; use listboxSelection'),
  },
  'react-ui-form': Object.fromEntries(
    [
      'ArrayField',
      'BooleanField',
      'ComboboxField',
      'DateField',
      'FieldEditor',
      'Form',
      'FormFieldHeader',
      'FormFieldLabel',
      'FormFieldRow',
      'FormFieldSet',
      'MarkdownField',
      'NumberField',
      'ObjectForm',
      'ObjectPicker',
      'ObjectProperties',
      'PasswordField',
      'RefEditor',
      'RefField',
      'SelectField',
      'TextAreaField',
      'TextField',
      'TupleField',
      'ViewEditor',
      'createSelectField',
    ].map((name) => [name, FORM_PENDING]),
  ),
  'react-ui-menu': {},
};

/** The Next parts of a composite, or undefined for a leaf (or a name with no Next counterpart). */
export const nextParts = (pkg: PackageName, name: string): string[] | undefined =>
  pkg === 'react-ui' ? REACT_UI_NEXT.parts[name] : pkg === 'react-ui-list' ? REACT_UI_LIST_NEXT.parts[name] : undefined;

/** The package whose current or Next entry `specifier` names. */
export const packageOf = (specifier: string): { pkg: PackageName; form: Form } | undefined => {
  for (const pkg of PACKAGES) {
    if (MODULES[pkg].current === specifier) {
      return { pkg, form: 'current' };
    }
    if (MODULES[pkg].next === specifier) {
      return { pkg, form: 'next' };
    }
  }
  return undefined;
};

/** Whether a reference reads the current entry or the Next one. */
export type Form = 'current' | 'next';

const PACKAGES: PackageName[] = ['react-ui', 'react-ui-list', 'react-ui-form', 'react-ui-menu'];
