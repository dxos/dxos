//
// Copyright 2026 DXOS.org
//

//
// Property panel for the selection: a schema-driven form over the properties every selected element
// declares alike (one element: its whole schema; a node's from its registry definition), so every field
// a type has is editable without a per-type form. Values the elements disagree on show as mixed; an edit
// writes only the changed fields, to every element, as one batch of `update` intents.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback, useMemo } from 'react';

import { type Database } from '@dxos/echo';
import {
  Form,
  type FormFieldMap,
  type FormFieldOverride,
  type FormFieldRenderer,
  type FormUpdateMeta,
  type RefFieldDataProps,
} from '@dxos/react-ui-form';
import * as Input from '@dxos/react-ui/Input';
import {
  BaseNode,
  CurveLink,
  type Element,
  type Layer,
  LineLink,
  type LinkType,
  type Node,
  type NodeStyle,
  SmartLink,
  SplineLink,
  type StyleClass,
  type StyleMap,
  isLink,
  isNoteNode,
  isViewNode,
  showsContents,
} from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { type CanvasAtoms, type Projection } from '../../../engine/index.ts';
import { SCENE_OVERLAY_ATTRIBUTE, useRegistry } from '../../../hooks/index.ts';
import { NO_STYLES, type NodeRegistry, getElement, nodeDef } from '../../../model/index.ts';
import {
  type ViewOption,
  classedLink,
  classedNode,
  commonSchema,
  elementLayer,
  flipLink,
  mergeValues,
  patchValues,
  portsPerSideOf,
  resolveStyle,
  splitClassEdit,
  viewLayers,
} from '../../../utils/index.ts';
import { defaultNodeRegistry } from '../../SceneLayer/index.ts';
import { OutlineStyleField, STYLE_FIELD_OVERRIDES, STYLE_FIELDS } from '../../StyleGrid/index.ts';
import { type InspectorProps } from '../types.ts';
import { AlignField } from './AlignField.tsx';
import { StyleClassesContext } from './ClassField.tsx';
import { FontField, FontSizeField } from './FontField.tsx';
import { FrameField } from './FrameField.tsx';
import { LayerClassField, LayersContext } from './LayerField.tsx';
import { LineStyleField } from './LineStyleField.tsx';
import { FlipLinksContext, MarkerField } from './MarkerField.tsx';
import { PolygonFitField } from './PolygonFitField.tsx';
import { ViewField, ViewOptionsContext } from './ViewField.tsx';

/** Identity, ordering and geometry lists are the surface's, not the user's; so is a diagram shape's DSL form. */
// `exposed` is Group's to set (each inner node a crossing link reaches), so its ports keep those links attached;
// an instance's `overrides` have no editor until the canvas can set them.
const HIDDEN = [
  'id',
  'type',
  'z',
  'ports',
  'points',
  'source',
  'target',
  'element',
  'heading',
  'connector',
  'exposed',
  'overrides',
];

/**
 * A string list as one entry per line: a UML compartment reads as a block of text, so a textarea
 * beats the generic array field's row of inputs. Blank lines survive while typing (they round-trip
 * through split/join) and are dropped on blur, when the form saves.
 */
export const LinesField: FormFieldRenderer = ({ type, label, jsonPath, readonly, getValue, onValueChange, onBlur }) => {
  const lines: string[] = getValue() ?? [];
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <Input.Textarea
        rows={4}
        classNames='font-mono'
        disabled={!!readonly}
        value={lines.join('\n')}
        onChange={(event) => onValueChange(type, event.target.value.split('\n'))}
        onBlur={(event) => {
          onValueChange(
            type,
            lines.map((line) => line.trim()).filter((line) => line.length > 0),
          );
          onBlur(event);
        }}
      />
    </Form.Field>
  );
};

/** Renderers by field path the panel always uses (the style grid); node types add their own (`NodeDef.fields`). */
export const DEFAULT_FIELDS: FormFieldMap = {
  ...STYLE_FIELDS,
  'style.alignHorizontal': AlignField,
  'style.fontFamily': FontField,
  'style.lineStyle': LineStyleField,
  'ends.start': MarkerField,
  'ends.end': MarkerField,
  'rotation': FrameField,
  'params.fit': PolygonFitField,
  'scene': ViewField,
  'layer': LayerClassField,
};

const LINK_SCHEMAS: Record<LinkType, Schema.Codec<any, any>> = {
  line: LineLink,
  curve: CurveLink,
  spline: SplineLink,
  smart: SmartLink,
};

/** An element's own schema; a type the registry does not know gets the core base's (`BaseNode`, or a line). */
const schemaOf = (nodes: NodeRegistry, element: Element): Schema.Codec<any, any> =>
  isLink(element) ? (LINK_SCHEMAS[element.type] ?? LineLink) : (nodeDef(nodes, element)?.schema ?? BaseNode);

/** Where a type places its text unless styled otherwise: a note from the top left, a label in the middle. */
const textAlign = (node: Node): Pick<NodeStyle, 'alignHorizontal' | 'alignVertical'> =>
  isNoteNode(node)
    ? { alignHorizontal: 'left', alignVertical: 'top' }
    : { alignHorizontal: 'center', alignVertical: 'middle' };

/**
 * What the form shows for an element: what the view draws, so its class's look, an unset fill, border or Show
 * contents read as they look and an unset port count as the type's.
 */
const formValues = (
  nodes: NodeRegistry,
  element: Element,
  styles: StyleMap,
  layers: readonly Layer[],
): Record<string, unknown> =>
  isLink(element)
    ? { ...element, layer: elementLayer(element, layers), style: classedLink(element, styles).style }
    : {
        ...element,
        layer: elementLayer(element, layers),
        style: { ...textAlign(element), ...resolveStyle(classedNode(element, styles).style) },
        portsPerSide: portsPerSideOf(nodes, element),
        ...(isViewNode(element) ? { link: { ...element.link, contents: showsContents(element) } } : {}),
      };

/**
 * How the panel presents fields. Ranges are the editor's, not the model's: a check on the stored schema would
 * make a record outside them (an older or imported scene) fail validation and drop out of the scene. The style
 * grid at `style.hue` also sets `style.tone`, which has no field of its own.
 */
const FIELD_OVERRIDES: Record<string, FormFieldOverride> = {
  ...STYLE_FIELD_OVERRIDES,
  'style.alignVertical': { hidden: true },
  'style.fontSize': { hidden: true },
  // Drawn beside the rotation by `FrameField`.
  'portsPerSide': { hidden: true },
  'scene': { label: 'View' },
  'layer': { label: 'Layer' },
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** The selection by kind, e.g. "3 nodes, 2 links". */
const describeSelection = (elements: readonly Element[]) => {
  const links = elements.filter(isLink).length;
  const nodes = elements.length - links;
  return [nodes > 0 && plural(nodes, 'node'), links > 0 && plural(links, 'link')].filter(Boolean).join(', ');
};

export type PropertiesInspectorProps = InspectorProps & {
  projection: Projection;
  atoms: CanvasAtoms;
  nodes?: NodeRegistry;
  fields?: FormFieldMap;
  /** The database a reference field picks from; without it reference fields are read-only. */
  db?: Database.Database;
  /** Narrows a reference field's candidates (e.g. to objects of one kind). */
  getOptions?: RefFieldDataProps['getOptions'];
  /** A host's per-selection field overrides (e.g. a field it allows only in some states), over the panel's own. */
  overrides?: (elements: readonly Element[]) => Record<string, FormFieldOverride>;
  /** The scenes a scene shape may open (`viewOptions`); without them its scene is not editable here. */
  viewOptions?: readonly ViewOption[];
  /** The drawing's style classes (`ViewStore.styles`); without them elements take no class. */
  styles?: Atom.Writable<StyleMap>;
  /** Whether each group (`style`, `center`, …) is open, by path, for a host that keeps it; unset, a group is open. */
  groups?: Readonly<Record<string, boolean>>;
  onGroupsChange?: (groups: Record<string, boolean>) => void;
};

/** The selection's properties, as one form; read-only too where the projection cannot `update`. */
export const PropertiesInspector = ({
  classNames,
  projection,
  atoms,
  nodes = defaultNodeRegistry,
  fields,
  readonly: readonlyProp = false,
  db,
  getOptions,
  overrides,
  viewOptions,
  styles,
  groups,
  onGroupsChange,
}: PropertiesInspectorProps) => {
  const registry = useRegistry();
  const scene = useAtomValue(projection.scene);
  const selection = useAtomValue(atoms.selection);
  const elements = useMemo(() => [...selection].flatMap((id) => getElement(scene, id) ?? []), [scene, selection]);
  const readonly = readonlyProp || !projection.capabilities.update;
  const styleMap = useAtomValue(styles ?? NO_STYLES);
  const layers = useMemo(() => viewLayers(scene), [scene]);

  // Keyed by the selected types, so the schema (and the form built on it) holds while values change under it.
  const typesKey = [...new Set(elements.map((element) => element.type))].sort().join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => commonSchema(elements.map((element) => schemaOf(nodes, element))), [typesKey, nodes]);
  // A shape's text names it, so its label leads, ahead of the shared fields (style) its type's own fields follow.
  const fieldOrder = useMemo(() => {
    const names =
      schema && SchemaAST.isObjects(schema.ast) ? schema.ast.propertySignatures.map(({ name }) => String(name)) : [];
    const style = names.indexOf('style');
    return names.includes('label') && style >= 0
      ? [
          ...names.slice(0, style).filter((name) => name !== 'label'),
          'label',
          ...names.slice(style).filter((name) => name !== 'label'),
        ]
      : undefined;
  }, [schema]);
  const { values, fieldOverrides } = useMemo(() => {
    const shown = elements.map((element) => formValues(nodes, element, styleMap, layers));
    const { values, mixed } = mergeValues(shown, Object.keys(shown[0] ?? {}));
    // A value the elements disagree on shows as indeterminate until it is edited, then applies to all of them.
    const fieldOverrides: Record<string, FormFieldOverride> = {
      ...FIELD_OVERRIDES,
      ...(viewOptions ? {} : { scene: { hidden: true } }),
      // The class is edited in the layer's row (`LayerClassField`).
      class: { hidden: true },
      // A link has no font face, so its size is not drawn by `FontField` and needs its own row.
      ...(elements.some(isLink) ? { 'style.fontSize': {} } : {}),
      ...overrides?.(elements),
    };
    for (const path of mixed) {
      fieldOverrides[path] = { ...fieldOverrides[path], indeterminate: true };
    }
    // Only a group reads these, so every top-level field may carry them.
    if (onGroupsChange) {
      for (const path of Object.keys(values)) {
        fieldOverrides[path] = {
          ...fieldOverrides[path],
          open: groups?.[path],
          onOpenChange: (open) => onGroupsChange({ ...groups, [path]: open }),
        };
      }
    }
    return { values, fieldOverrides };
  }, [elements, nodes, overrides, viewOptions, styles, styleMap, layers, groups, onGroupsChange]);

  const onSave = useCallback(
    (values: Record<string, unknown>, { changed }: FormUpdateMeta<Record<string, unknown>>) => {
      const paths = Object.keys(changed).filter((path) => changed[path as keyof typeof changed]);
      // A classed element's look is its class's: an edit of it restyles the class, and so every element deriving it.
      const classes: Record<string, StyleClass> = {};
      const intents = elements.map((element) => {
        const shown = formValues(nodes, element, styleMap, layers);
        // The element's own style as the base, so a field the panel shows resolved (an unset corner as on) is not written.
        const patch = patchValues({ ...shown, style: element.style }, values, paths);
        const styleClass = styles && element.class ? (classes[element.class] ?? styleMap[element.class]) : undefined;
        // Taking a class drops the element's own look, so it derives the class's whole rather than in part.
        if (typeof patch.class === 'string') {
          return { kind: 'update' as const, id: element.id, values: { ...patch, style: undefined } };
        }
        if (!styleClass || !('style' in patch)) {
          return { kind: 'update' as const, id: element.id, values: patch };
        }
        // A link's look is the common base of its class's style; a node's, the whole of it.
        const look = isLink(element)
          ? classedLink(element, styleMap).style
          : resolveStyle(classedNode(element, styleMap).style);
        const split = splitClassEdit(look, patch.style, styleClass.style ?? {}, element.style);
        classes[styleClass.id] = { ...styleClass, style: split.classLook };
        return { kind: 'update' as const, id: element.id, values: { ...patch, style: split.own } };
      });
      if (styles && Object.keys(classes).length > 0) {
        registry.set(styles, { ...styleMap, ...classes });
      }
      projection.apply({ kind: 'batch', intents });
    },
    [projection, elements, nodes, styles, styleMap, layers, registry],
  );

  // Reverses every selected link (source and target swap; an arrow comes to point the other way), as one batch.
  const links = useMemo(() => elements.filter(isLink), [elements]);
  const onFlip = useCallback(() => {
    projection.apply({
      kind: 'batch',
      intents: links.map((link) => ({ kind: 'update' as const, id: link.id, values: flipLink(link) })),
    });
    // A spline's control points run the other way after a flip, so a selected point's index names another one.
    registry.set(atoms.point, undefined);
  }, [projection, links, registry, atoms.point]);
  const flip = !readonly && links.length > 0 && links.length === elements.length ? onFlip : undefined;

  // The selected node types' own renderers over the panel's; a host's `fields` win over both. One style picker for
  // every kind: its fill rows only when every element is a node, since a link has a colour but no fill.
  const fieldMap = useMemo(
    () => ({
      ...DEFAULT_FIELDS,
      ...(elements.some(isLink) ? { 'style.hue': OutlineStyleField, 'style.fontSize': FontSizeField } : {}),
      ...Object.assign(
        {},
        ...elements.map((element) => (isLink(element) ? {} : (nodeDef(nodes, element)?.fields ?? {}))),
      ),
      ...fields,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typesKey, nodes, fields],
  );

  // Nothing to edit: the host hides the inspector (and its section) rather than show an empty one.
  if (elements.length === 0) {
    return null;
  }

  const summary = elements.length > 1 && `${describeSelection(elements)}${schema ? '' : ' — no shared properties'}`;
  return (
    <div className={mx(classNames)} data-testid='properties' {...{ [SCENE_OVERLAY_ATTRIBUTE]: true }}>
      {schema && (
        <FlipLinksContext.Provider value={flip}>
          <LayersContext.Provider value={layers}>
            <StyleClassesContext.Provider value={styles ? styleMap : undefined}>
              <ViewOptionsContext.Provider value={viewOptions ?? []}>
                <Form.Root
                  key={[...selection].join()}
                  schema={schema}
                  values={values}
                  fieldOverrides={fieldOverrides}
                  fieldMap={fieldMap}
                  db={db}
                  getOptions={getOptions}
                  readonly={readonly}
                  autoSave
                  // A typed value writes the scene once, when the field blurs, not on every keystroke.
                  commitOn='blur'
                  onSave={onSave}
                >
                  {/* The inspector panel scrolls its sections together, so the form keeps no scroll of its own. */}
                  <Form.Viewport scroll={false}>
                    <Form.Content>
                      <Form.Fields exclude={HIDDEN} sort={fieldOrder} />
                    </Form.Content>
                  </Form.Viewport>
                </Form.Root>
              </ViewOptionsContext.Provider>
            </StyleClassesContext.Provider>
          </LayersContext.Provider>
        </FlipLinksContext.Provider>
      )}
      {summary && (
        <p className='p-2 text-center text-sm text-fg-muted' data-testid='properties-summary'>
          {summary}
        </p>
      )}
    </div>
  );
};
