//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type Element } from '../code-file.ts';
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
import { IMPORT_TARGETS, type PackageName } from '../targets.ts';
import { listboxRoot, menuItem, selectRoot } from './collections.ts';
import {
  type RuleContext,
  cardActionButton,
  dialogActionButton,
  labelledControl,
  listboxItemContent,
  virtualTrigger,
} from './composites.ts';
import { buttonDensity, isButton } from './density.ts';
import {
  blockEnd,
  buttonAroundTrigger,
  buttonTitleIcon,
  checkedChange,
  contentPlacement,
  openChange,
} from './popups.ts';
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
  // A lone `Select.ItemText` child carries the label: the Next item renders its own text.
  const [only] = children;
  const itemText =
    children.length === 1 &&
    ts.isJsxElement(only) &&
    file.resolve(only.openingElement.tagName)?.path.join('.') === 'Select.ItemText'
      ? only.children.filter((child) => !(ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces))
      : undefined;
  const labelChildren = itemText ?? children;
  let label: string | undefined;
  if (labelChildren.length === 0) {
    label = itemText ? undefined : valueText;
  } else if (labelChildren.length === 1 && ts.isJsxText(labelChildren[0])) {
    label = `'${labelChildren[0].text.trim().replaceAll("'", "\\'")}'`;
  } else if (labelChildren.length === 1 && ts.isJsxExpression(labelChildren[0]) && labelChildren[0].expression) {
    label = labelChildren[0].expression.getText(file.sourceFile);
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

/** A `Select.Item` still carrying the current `value` and children: the same conversion as `Select.Option`. */
const selectItemValue = (ctx: RuleContext) => {
  if (getAttr(ctx.element, 'value') && !getAttr(ctx.element, 'item')) {
    selectItem(ctx);
  }
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

/** The current presets' `active` is the Next toggle's `pressed` and the disclosure's `expanded`. */
const SYSTEM_STATE_PROPS: Record<string, Record<string, string>> = {
  Star: { active: 'pressed' },
  Bookmark: { active: 'pressed' },
  Disclosure: { active: 'expanded' },
};

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
    'Toolbar.Button': {
      ...button(['Button']),
      apply: (ctx) => {
        buttonProps(ctx);
        buttonAroundTrigger(ctx);
      },
    },
    'Button': {
      apply: (ctx) => {
        buttonAroundTrigger(ctx);
        buttonTitleIcon(ctx);
      },
    },
    'Toolbar.ToggleGroupItem': { to: ['ToggleGroup', 'Item'] },
    'Toolbar.DragHandle': { to: ['DragHandle'], props: { testId: 'data-testid' } },
    'DragHandle': { props: { testId: 'data-testid' } },
    'ToggleGroup': { to: ['ToggleGroup', 'Root'] },
    'ToggleGroupItem': { to: ['ToggleGroup', 'Item'] },
    'ToggleGroupIconItem': button(['ToggleGroup', 'Item']),
    'Toolbar.ToggleGroupIconItem': button(['ToggleGroup', 'Item']),
    'IconBlock': { to: ['Block'], drop: ['square'] },
    'Field.Block': { to: ['Block'] },
    'Card.DragHandle': { to: ['DragHandle'], props: { testId: 'data-testid' } },
    'Card.Block': { to: ['Block'], apply: blockEnd },
    'Block': { apply: blockEnd },
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
    // Next's trigger has one look (a control showing the chosen option); `variant` has no counterpart.
    'Select.TriggerButton': { to: ['Select', 'Trigger'], drop: ['variant'] },
    'Select.Trigger': { drop: ['variant'] },
    'Select.Portal': UNWRAP,
    'Select.Viewport': UNWRAP,
    'Select.Arrow': UNWRAP,
    'Select.Option': { apply: selectItem },
    'Select.Item': { apply: selectItemValue },
    'Select.Group': { to: ['Select', 'ItemGroup'] },
    'Select.Root': { apply: selectRoot },
    // Menu.
    'Menu.Portal': UNWRAP,
    'Menu.Viewport': UNWRAP,
    'Menu.Arrow': UNWRAP,
    'Menu.Group': { to: ['Menu', 'ItemGroup'] },
    'Menu.RadioGroup': { to: ['Menu', 'RadioItemGroup'] },
    'Menu.SubTrigger': { to: ['Menu', 'TriggerItem'] },
    'Menu.SubContent': { to: ['Menu', 'Content'], residue: 'Menu.SubContent → a nested Menu.Content inside Menu.Sub' },
    'Menu.VirtualTrigger': { apply: virtualTrigger },
    'Menu.Item': { apply: menuItem },
    'Menu.CheckboxItem': { apply: menuItem },
    // Card, ScrollArea.
    'Card.Root': { drop: ['fullWidth'] },
    'Card.Poster': {
      props: { image: 'src' },
      review: {
        icon: 'Card.Poster icon has no Next part: render an Image fallback or an Icon in a Block by hand',
      },
      apply: ({ file, element }) => {
        const aspect = getAttr(element, 'aspect');
        const value = aspect ? attrValue(aspect) : undefined;
        if (!aspect || !value) {
          return;
        }
        if (value.kind === 'string' && value.value === 'video') {
          removeAttr(file, aspect);
        } else if (value.kind === 'string' && value.value === 'auto') {
          file.replace(aspect, "aspectRatio='auto'");
        } else {
          file.report(aspect, 'Card.Poster aspect → Image aspectRatio (16 / 9 by default)');
          return;
        }
        file.count('Card.Poster aspect → aspectRatio');
      },
    },
    'ScrollArea.Root': {
      drop: ['thin', 'centered'],
      review: { padding: 'ScrollArea padding dropped: compose Viewport asChild > Container gutter by hand' },
      apply: ({ file, element }) => {
        const padding = getAttr(element, 'padding');
        if (padding) {
          removeAttr(file, padding);
        }
      },
    },
    // Popups: Ark open details and Root positioning.
    ...Object.fromEntries(
      ['Popover', 'Menu', 'Dialog', 'AlertDialog', 'HoverCard', 'Collapsible', 'Tour', 'FloatingPanel'].map((name) => [
        `${name}.Root`,
        { apply: openChange },
      ]),
    ),
    ...Object.fromEntries(
      ['Popover', 'Menu', 'HoverCard', 'Select'].map((name) => [`${name}.Content`, { apply: contentPlacement }]),
    ),
    // Ark's menu has no `modal`; it never traps the page.
    'Menu.Root': { drop: ['modal'], apply: openChange },
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
      ].map((name) => [
        `SystemIconButton.${name}`,
        { to: ['SystemButton', name], props: SYSTEM_STATE_PROPS[name], apply: buttonProps },
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(SYSTEM_STATE_PROPS).map(([name, props]) => [`SystemButton.${name}`, { props }]),
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
    'ScrollContainer.Content': {
      drop: ['padding', 'centered'],
      apply: ({ file, element }) => {
        const thin = getAttr(element, 'thin');
        const value = thin ? attrValue(thin) : undefined;
        if (!thin || !value) {
          return;
        }
        if (value.kind === 'true' || (value.kind === 'boolean' && value.value)) {
          file.replace(thin, "width='thin'");
        } else if (value.kind === 'boolean') {
          file.replace(thin, "width='regular'");
        } else {
          file.report(thin, "ScrollContainer.Content thin → width ('thin' | 'regular')");
          return;
        }
        file.count('ScrollContainer.Content thin → width');
      },
    },
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
        // NumberInput reports `onValueChange(text, number)`, not change events; an `onChange` keeps the native input.
        if (target === 'NumberInput' && getAttr(element, 'onChange')) {
          renameElement(file, element, ['Input']);
          file.count('Field.Input type=number with onChange → Input');
          return;
        }
        if (target && type) {
          removeAttr(file, type);
        }
        renameElement(file, element, [target ?? 'Input']);
        file.count(`Field.Input → ${target ?? 'Input'}`);
      },
    },
    'Field.Switch': {
      apply: (ctx) => {
        labelledControl('Switch')(ctx);
        checkedChange(ctx);
      },
    },
    'Field.Checkbox': {
      apply: (ctx) => {
        labelledControl('Checkbox')(ctx);
        checkedChange(ctx);
      },
    },
    'Checkbox': { apply: checkedChange },
    'Switch': { apply: checkedChange },
    'NumberInput': {
      apply: ({ file, element }) => {
        if (getAttr(element, 'onChange')) {
          renameElement(file, element, ['Input']);
          addAttr(file, element, "type='number'");
          file.count('NumberInput with onChange → Input type=number');
        }
      },
    },
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
    'Listbox.Root': { apply: listboxRoot },
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

/** A current-entry part with no Next counterpart (e.g. the current Tree) keeps its current props. */
const staysCurrent = ({ identity }: Element) =>
  identity.form === 'current' && IMPORT_TARGETS[identity.pkg][identity.path[0]]?.kind === 'none';

const density = ({ file, element }: RuleContext, key: string) => {
  const attr = getAttr(element, 'density');
  if (!attr || isButton(key) || staysCurrent(element)) {
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
const REBUILT = new Set<Rule['apply']>([
  selectItemValue,
  avatarRoot,
  bannerEmpty,
  selectItem,
  listboxItemContent,
  virtualTrigger,
  menuItem,
]);

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
