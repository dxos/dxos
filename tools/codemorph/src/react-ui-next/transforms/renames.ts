//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import {
  addAttr,
  attributes,
  attrName,
  attrText,
  attrValue,
  getAttr,
  meaningfulChildren,
  removeAttr,
  renameAttr,
  renameElement,
  tagText,
  unwrap,
} from '../jsx.ts';
import { type PackageName } from '../targets.ts';
import {
  type RuleContext,
  cardActionButton,
  dialogActionButton,
  labelledControl,
  listboxItemContent,
  virtualTrigger,
} from './composites.ts';
import { buttonDensity, isButton } from './density.ts';
import { type Transform } from './transform.ts';

/** How one current part becomes its Next counterpart. */
type Rule = {
  /** New export path; a different first segment changes the root binding. */
  to?: string[];
  /** Package of `to` when it differs from the element's (e.g. a list part becoming a react-ui Button). */
  pkg?: PackageName;
  /** Replace the element by its children (or remove it when it has none). */
  unwrap?: boolean;
  /** Attributes with no Next meaning, removed. */
  drop?: string[];
  /** Attribute renames. */
  props?: Record<string, string>;
  /** Attributes kept but reported, with the reason. */
  review?: Record<string, string>;
  /** The element always needs a look, with the reason. */
  residue?: string;
  /** Runs after the declarative steps. */
  apply?: (ctx: RuleContext) => void;
};

/** Icon (and IconButton) numeric sizes are Tailwind `size-N` steps; Next sizes are the xs–xl scale. */
const ICON_SIZES: Record<number, string> = { 3: 'xs', 3.5: 'sm', 4: 'md', 5: 'lg', 6: 'xl' };

/** Maps a numeric `size` to `name` on the xs–xl scale, reporting values off the scale. */
const iconSize = ({ file, element }: RuleContext, name: string) => {
  const attr = getAttr(element, 'size');
  if (!attr) {
    return;
  }
  const value = attrValue(attr);
  if (value.kind === 'number') {
    const exact = ICON_SIZES[value.value];
    const size = exact ?? nearestIconSize(value.value);
    file.replace(attr, attrText(name, size));
    if (exact) {
      file.count(`size={n} → ${name}='xs–xl'`);
    } else {
      file.count(`size={n} → ${name}='xs–xl' (rounded)`);
      file.report(attr, `size {${value.value}} rounded to the nearest step, '${size}'`);
    }
  } else if (value.kind !== 'string') {
    file.report(attr, `size ${attr.initializer?.getText(file.sourceFile) ?? ''} is computed; map it to xs–xl by hand`);
  }
};

/** The xs–xl step nearest a Tailwind `size-N`. */
const nearestIconSize = (value: number): string => {
  const [nearest] = Object.entries(ICON_SIZES).sort(
    ([a], [b]) => Math.abs(Number(a) - value) - Math.abs(Number(b) - value),
  );
  return nearest[1];
};

/** Button props shared by IconButton, Toolbar.IconButton and Toolbar.Button. */
const buttonProps = (ctx: RuleContext) => {
  const { file, element } = ctx;
  iconSize(ctx, 'iconSize');
  const iconOnly = getAttr(element, 'iconOnly');
  const iconOnlyValue = iconOnly ? attrValue(iconOnly) : undefined;
  const noTooltip = getAttr(element, 'noTooltip');
  if (noTooltip) {
    const value = attrValue(noTooltip);
    if (iconOnlyValue?.kind === 'true' || (iconOnlyValue?.kind === 'boolean' && iconOnlyValue.value)) {
      if (value.kind === 'true' || value.kind === 'boolean') {
        file.replace(noTooltip, attrText('showTooltip', value.kind === 'boolean' ? !value.value : false));
        file.count('noTooltip → showTooltip={false}');
      } else {
        file.report(noTooltip, 'noTooltip with an expression; Next uses showTooltip (inverted)');
      }
    } else if (!iconOnly) {
      removeAttr(file, noTooltip);
      file.count('noTooltip dropped (no tooltip without iconOnly)');
    } else {
      file.report(noTooltip, 'noTooltip with a dynamic iconOnly; Next uses showTooltip (inverted)');
    }
  }
  const iconEnd = getAttr(element, 'iconEnd');
  const icon = getAttr(element, 'icon');
  if (iconEnd) {
    const value = attrValue(iconEnd);
    if ((value.kind === 'true' || (value.kind === 'boolean' && value.value)) && icon?.initializer) {
      file.replace(iconEnd, `iconEnd=${icon.initializer.getText(file.sourceFile)}`);
      removeAttr(file, icon);
      file.count('iconEnd (boolean) → iconEnd={icon}');
    } else if (value.kind !== 'string') {
      file.report(iconEnd, 'iconEnd is a boolean in the current Button and the icon name in Next');
    }
  }
  const iconClassNames = getAttr(element, 'iconClassNames');
  if (iconClassNames) {
    file.report(iconClassNames, 'iconClassNames has no Next equivalent (Button has no icon slot)');
  }
};

const button = (to: string[]): Rule => ({ to, drop: ['square'], apply: buttonProps });

/** Tabs default to vertical in the current component and horizontal in Next; keep the current behaviour. */
const tabsRoot = ({ file, element }: RuleContext) => {
  if (!getAttr(element, 'orientation')) {
    addAttr(file, element, "orientation='vertical'");
    file.count("Tabs.Root orientation='vertical' (current default)");
  }
};

/** `<Select.Option value='a'>Label</Select.Option>` → `<Select.Item item={{ value: 'a', label: 'Label' }} />`. */
const selectItem = ({ file, element }: RuleContext) => {
  const value = getAttr(element, 'value');
  const children = meaningfulChildren(element);
  const valueText = value?.initializer
    ? ts.isStringLiteral(value.initializer)
      ? value.initializer.getText(file.sourceFile)
      : ts.isJsxExpression(value.initializer) && value.initializer.expression
        ? value.initializer.expression.getText(file.sourceFile)
        : undefined
    : undefined;
  let label: string | undefined;
  if (children.length === 0) {
    label = valueText;
  } else if (children.length === 1 && ts.isJsxText(children[0])) {
    label = `'${children[0].text.trim().replaceAll("'", "\\'")}'`;
  } else if (children.length === 1 && ts.isJsxExpression(children[0]) && children[0].expression) {
    label = children[0].expression.getText(file.sourceFile);
  }
  if (!value || !valueText || !label) {
    renameElement(file, element, ['Select', 'Item']);
    file.count('Select.Option → Select.Item');
    file.report(element.opening, 'Select.Item takes `item` data ({ value, label }); children replace the whole row');
    return;
  }
  const props = element.opening.attributes.properties
    .filter((prop) => prop !== value)
    .map((prop) => prop.getText(file.sourceFile));
  const item = `item={{ value: ${valueText}, label: ${label} }}`;
  file.replace(element.node, `<${tagText(file, element, ['Select', 'Item'])} ${[...props, item].join(' ')} />`);
  file.claim(element.node);
  file.count('Select.Option → Select.Item item={…}');
};

/** Avatar.Root (ids only) + Avatar.Content → one Avatar.Root element. */
const avatarRoot = ({ file, element }: RuleContext) => {
  const children = meaningfulChildren(element);
  const contents = children.filter((child) => {
    const opening = ts.isJsxElement(child)
      ? child.openingElement
      : ts.isJsxSelfClosingElement(child)
        ? child
        : undefined;
    const identity = opening ? file.resolve(opening.tagName) : undefined;
    return identity?.pkg === 'react-ui' && identity.path.join('.') === 'Avatar.Content';
  });
  const [content] = contents;
  if (children.length !== 1 || !content || !ts.isJsxSelfClosingElement(content)) {
    file.report(
      element.opening,
      'Avatar.Root holds more than a lone Avatar.Content: merge by hand (Label/Description → label or aria-labelledby)',
    );
    return;
  }
  const rootProps = attributes(element).map((attr) => {
    const name = attrName(attr);
    const renamed = name === 'labelId' ? 'aria-labelledby' : name === 'descriptionId' ? 'aria-describedby' : name;
    return renamed === name
      ? attr.getText(file.sourceFile)
      : `${renamed}${attr.initializer ? `=${attr.initializer.getText(file.sourceFile)}` : ''}`;
  });
  const contentProps = content.attributes.properties.map((prop) => {
    if (ts.isJsxAttribute(prop) && attrName(prop) === 'imgSrc') {
      return `src${prop.initializer ? `=${prop.initializer.getText(file.sourceFile)}` : ''}`;
    }
    if (ts.isJsxAttribute(prop) && attrName(prop) === 'size') {
      file.report(prop, 'Avatar size is xs–xl (a block across) or fill in Next');
    }
    return prop.getText(file.sourceFile);
  });
  const tag = element.opening.tagName.getText(file.sourceFile);
  file.replace(element.node, `<${tag} ${[...rootProps, ...contentProps].join(' ')} />`);
  file.claim(element.node);
  file.count('Avatar.Root + Avatar.Content → Avatar.Root');
};

/** `<Banner.Empty icon label />` → `<Empty icon>{label}</Empty>` (decided 2026-10-01: the text is the children). */
const bannerEmpty = ({ file, element }: RuleContext) => {
  const label = getAttr(element, 'label');
  if (meaningfulChildren(element).length > 0) {
    renameElement(file, element, ['Empty']);
    file.report(element.opening, 'Banner.Empty with children: Next.Empty takes its text as children');
    return;
  }
  const props = element.opening.attributes.properties
    .filter((prop) => prop !== label)
    .map((prop) => prop.getText(file.sourceFile));
  const tag = tagText(file, element, ['Empty']);
  const open = [tag, ...props].join(' ');
  const text = !label?.initializer
    ? undefined
    : ts.isStringLiteral(label.initializer) && !/[{}<>]/.test(label.initializer.text)
      ? label.initializer.text
      : ts.isStringLiteral(label.initializer)
        ? `{${label.initializer.getText(file.sourceFile)}}`
        : label.initializer.getText(file.sourceFile);
  file.replace(element.node, text === undefined ? `<${open} />` : `<${open}>${text}</${tag}>`);
  file.claim(element.node);
  file.count('Banner.Empty → Empty');
};

/** Props kept but reported, since Next dropped what they did. */
const review = (reasons: Record<string, string>): Rule => ({ review: reasons });

const UNWRAP: Rule = { unwrap: true };

/** Renames and drops by package and export path; recorded in AUDIT §7 Phase A item 4 and MIGRATION-INVENTORY §2. */
const RULES: Record<PackageName, Record<string, Rule>> = {
  'react-ui': {
    // Panel.
    'Panel.Toolbar': { to: ['Panel', 'Header'], drop: ['asChild'] },
    'Panel.Statusbar': { to: ['Panel', 'Footer'], drop: ['asChild'] },
    'Panel.Content': { to: ['Panel', 'Body'] },
    // Buttons.
    'IconButton': button(['Button']),
    'Toolbar.IconButton': button(['Button']),
    'Toolbar.Button': button(['Button']),
    'Toolbar.ToggleGroupItem': { to: ['ToggleGroup', 'Item'] },
    'Toolbar.DragHandle': { to: ['DragHandle'] },
    'ToggleGroupItem': { to: ['ToggleGroup', 'Item'] },
    'ToggleGroupIconItem': button(['ToggleGroup', 'Item']),
    'Toolbar.ToggleGroupIconItem': button(['ToggleGroup', 'Item']),
    'IconBlock': { to: ['Block'], drop: ['square'] },
    'Field.Block': { to: ['Block'] },
    'Card.DragHandle': { to: ['DragHandle'] },
    'Card.Block': { to: ['Block'] },
    'Card.ActionIconButton': { apply: cardActionButton },
    // Dialogs.
    'Dialog.Close': { to: ['Dialog', 'CloseTrigger'] },
    'Dialog.ActionBar': { to: ['Dialog', 'Footer'] },
    'Dialog.Overlay': UNWRAP,
    'Dialog.Portal': UNWRAP,
    'Dialog.ActionIconButton': { apply: dialogActionButton },
    'AlertDialog.ActionBar': { to: ['AlertDialog', 'Footer'] },
    'AlertDialog.Overlay': UNWRAP,
    'AlertDialog.Portal': UNWRAP,
    // Popover, Tooltip.
    'Popover.Portal': UNWRAP,
    'Popover.Arrow': UNWRAP,
    'Popover.Viewport': { to: ['Popover', 'Body'] },
    'Popover.Close': { to: ['Popover', 'CloseTrigger'] },
    'Popover.VirtualTrigger': { apply: virtualTrigger },
    'Tooltip.Provider': UNWRAP,
    // Select.
    'Select.TriggerButton': { to: ['Select', 'Trigger'] },
    'Select.Portal': UNWRAP,
    'Select.Viewport': UNWRAP,
    'Select.Arrow': UNWRAP,
    'Select.Option': { apply: selectItem },
    'Select.Group': { to: ['Select', 'ItemGroup'] },
    // Menu.
    'Menu.Portal': UNWRAP,
    'Menu.Viewport': UNWRAP,
    'Menu.Arrow': UNWRAP,
    'Menu.Group': { to: ['Menu', 'ItemGroup'] },
    'Menu.RadioGroup': { to: ['Menu', 'RadioItemGroup'] },
    'Menu.SubTrigger': { to: ['Menu', 'TriggerItem'] },
    'Menu.SubContent': { to: ['Menu', 'Content'], residue: 'Menu.SubContent → a nested Menu.Content inside Menu.Sub' },
    'Menu.VirtualTrigger': { apply: virtualTrigger },
    // System buttons.
    ...Object.fromEntries(
      [
        'Add',
        'Ai',
        'Bookmark',
        'Clipboard',
        'Close',
        'Delete',
        'Disclosure',
        'Download',
        'Edit',
        'Mic',
        'Star',
        'Upload',
      ].map((name) => [`SystemIconButton.${name}`, { to: ['SystemButton', name], apply: buttonProps }]),
    ),
    // Phase A4 ports.
    'Tabs.Root': { apply: tabsRoot },
    'Tabs.Tablist': { to: ['Tabs', 'List'] },
    'Tabs.Button': { to: ['Tabs', 'Trigger'] },
    'Tabs.IconButton': { to: ['Tabs', 'Trigger'] },
    'Tabs.Panel': { to: ['Tabs', 'Content'] },
    'Tabs.Viewport': { residue: 'master-detail Tabs are removed: compose Tabs + Splitter (collapseBelow)' },
    'Tabs.BackButton': { residue: 'master-detail Tabs are removed: compose Tabs + Splitter (collapseBelow)' },
    'Tabs.TabGroupHeading': { residue: 'Tabs.TabGroupHeading is not ported' },
    'Tabs.TabPrimitive': { residue: 'Tabs.TabPrimitive is not ported' },
    'Splitter.Handle': { to: ['Splitter', 'ResizeTrigger'] },
    'Toast.Viewport': { to: ['Toast', 'Toaster'] },
    'Toast.Actions': { to: ['Toast', 'Footer'] },
    'Toast.Action': { to: ['Toast', 'ActionTrigger'], drop: ['altText'] },
    'Toast.Close': { to: ['Toast', 'CloseTrigger'] },
    'Toast.Root': { drop: ['type'] },
    'Toast.Title': review({
      icon: 'Toast.Title icon → Toast.Header icon',
      onClose: 'Toast.Title onClose → Toast.Header (CloseTrigger reports through onOpenChange)',
    }),
    'Avatar.Root': { apply: avatarRoot },
    'Tag': review({ asChild: 'Next.Tag has no asChild' }),
    'Banner.Empty': { apply: bannerEmpty },
    'Banner.Content': UNWRAP,
    'Avatar.Label': { residue: 'Avatar.Label → Avatar.Root label or aria-labelledby' },
    'Avatar.Description': { residue: 'Avatar.Description → aria-describedby' },
    'Progress': { props: { progress: 'value' } },
    'Accordion.ItemHeader': { to: ['Accordion', 'ItemTrigger'] },
    'Accordion.ItemBody': { to: ['Accordion', 'ItemContent'] },
    'Accordion.Root': review({
      items: 'Accordion items/getId render prop is not ported',
      getId: 'Accordion getId is not ported',
    }),
    'Carousel.Viewport': { to: ['Carousel', 'ItemGroup'] },
    'Carousel.Slide': { to: ['Carousel', 'Item'] },
    'Carousel.Previous': { to: ['Carousel', 'PrevTrigger'] },
    'Carousel.Next': { to: ['Carousel', 'NextTrigger'] },
    'Carousel.Indicators': { to: ['Carousel', 'IndicatorGroup'] },
    'Carousel.Content': {
      unwrap: true,
      residue: 'Carousel.Content dropped: Root is the grid (a subgrid may be needed)',
    },
    'Breadcrumb.ListItem': {
      to: ['Breadcrumb', 'Item'],
      review: { asChild: 'Breadcrumb.Item has no asChild: Item > Link asChild' },
    },
    ...Object.fromEntries(
      ['HoverCard', 'Tour', 'FloatingPanel'].flatMap((name) => [
        [`${name}.Portal`, UNWRAP],
        [`${name}.Arrow`, UNWRAP],
        [`${name}.Backdrop`, UNWRAP],
        [`${name}.Spotlight`, UNWRAP],
        [`${name}.Positioner`, UNWRAP],
        [`${name}.Resizers`, UNWRAP],
        [`${name}.Close`, { to: [name, 'CloseTrigger'] }],
      ]),
    ),
    'ScrollContainer.Content': review({
      thin: 'ScrollContainer.Content thin → width',
      padding: 'padding dropped',
      centered: 'centered dropped',
    }),
    'Slider': { drop: ['thumbSize', 'thumbAlignment'] },
    'TextCrawl': review({
      size: 'TextCrawl size comes from data-size',
      textClassNames: 'TextCrawl textClassNames dropped',
    }),
    // Fields.
    'Field.Textarea': { to: ['Textarea'] },
    'Field.PinInput': { to: ['PinInput'] },
    'Field.Input': {
      apply: ({ file, element }) => {
        const type = getAttr(element, 'type');
        const value = type ? attrValue(type) : undefined;
        const target =
          value?.kind === 'string' ? { number: 'NumberInput', password: 'PasswordInput' }[value.value] : undefined;
        if (target && type) {
          removeAttr(file, type);
        }
        renameElement(file, element, [target ?? 'Input']);
        file.count(`Field.Input → ${target ?? 'Input'}`);
      },
    },
    'Field.Switch': { apply: labelledControl('Switch') },
    'Field.Checkbox': { apply: labelledControl('Checkbox') },
    'Field.TriggerIcon': { residue: 'Field.TriggerIcon → DateInput trigger or a Button in the end slot' },
  },
  'react-ui-list': {
    'Combobox.VirtualTrigger': { apply: virtualTrigger },
    'Listbox.ItemLabel': { to: ['Listbox', 'ItemText'] },
    'Listbox.Indicator': { to: ['Listbox', 'ItemIndicator'] },
    'Listbox.Viewport': {
      unwrap: true,
      residue: 'Listbox.Viewport dropped: Listbox.Content scrolls (scroll={false} to defer to the host)',
    },
    'Listbox.ItemContent': { apply: listboxItemContent },
    'OrderedList.Title': { to: ['OrderedList', 'ItemText'] },
    'OrderedList.Viewport': {
      unwrap: true,
      residue: 'OrderedList.Viewport dropped: OrderedList.Content scrolls by default',
    },
    'OrderedList.IconButton': { ...button(['Button']), pkg: 'react-ui' },
    'OrderedList.DeleteButton': { to: ['SystemButton', 'Remove'], pkg: 'react-ui' },
    'OrderedList.DetailItem': { residue: 'OrderedList.DetailItem → Item collapsible + OrderedList.Detail' },
  },
  'react-ui-form': {},
  'react-ui-menu': {},
};

const DENSITIES = new Set(['sm', 'md', 'lg']);

const density = ({ file, element }: RuleContext, key: string) => {
  const attr = getAttr(element, 'density');
  if (!attr || isButton(key)) {
    return;
  }
  const value = attrValue(attr);
  renameAttr(file, attr, 'size');
  file.count('density= → size=');
  if (value.kind !== 'string' || !DENSITIES.has(value.value)) {
    file.report(attr, 'density with a computed value renamed to size; check it is xs–xl');
  }
};

const applyRule = (ctx: RuleContext, rule: Rule, key: string) => {
  const { file, element } = ctx;
  for (const name of rule.drop ?? []) {
    const attr = getAttr(element, name);
    if (attr) {
      removeAttr(file, attr);
      file.count(`${key} ${name} dropped`);
    }
  }
  for (const [from, to] of Object.entries(rule.props ?? {})) {
    const attr = getAttr(element, from);
    if (attr) {
      renameAttr(file, attr, to);
      file.count(`${key} ${from} → ${to}`);
    }
  }
  for (const [name, reason] of Object.entries(rule.review ?? {})) {
    const attr = getAttr(element, name);
    if (attr) {
      file.report(attr, reason);
    }
  }
  if (rule.residue) {
    file.report(element.opening, rule.residue);
  }
  if (rule.unwrap) {
    const props = attributes(element)
      .map(attrName)
      .filter((name) => name !== 'key');
    if (props.length > 0) {
      file.report(element.opening, `${key} unwrapped; its props need a new home (${props.join(', ')})`);
    }
    unwrap(file, element);
    file.count(`${key} unwrapped`);
    return;
  }
  if (rule.to) {
    renameElement(file, element, rule.to, rule.pkg);
    file.count(`${key} → ${rule.to.join('.')}`);
  }
  rule.apply?.(ctx);
};

/** Whether `renames` converts or reports this part, so a later transform need not report it again. */
export const hasRenameRule = (pkg: PackageName, key: string): boolean => RULES[pkg][key] !== undefined;

/** Rules that rebuild the whole element from its source text, so generic prop edits would overlap them. */
const REBUILT = new Set<Rule['apply']>([avatarRoot, bannerEmpty, selectItem, listboxItemContent, virtualTrigger]);

export const renames: Transform = {
  name: 'renames',
  description: 'Part and prop renames from the inventory and the part-naming audit.',
  applies: (text) => text.includes('@dxos/react-ui'),
  run: (file) => {
    for (const element of file.elements()) {
      const key = element.identity.path.join('.');
      const ctx = { file, element };
      const rule = RULES[element.identity.pkg][key];
      // A rebuilt element owns its whole range, so nothing inside it may be edited again.
      if (file.isClaimed(element.node)) {
        continue;
      }
      if (!rule?.unwrap && !REBUILT.has(rule?.apply)) {
        if (isButton(key)) {
          buttonDensity(file, element);
        } else {
          density(ctx, key);
        }
        if (key === 'Icon') {
          iconSize(ctx, 'size');
        }
      }
      if (rule) {
        applyRule(ctx, rule, key);
      }
    }
  },
};
