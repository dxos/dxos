//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useState } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import { type Collection, FileType, StackView, Section } from '@braneframe/types';
import {
  LayoutAction,
  NavigationAction,
  Surface,
  defaultFileTypes,
  parseMetadataResolverPlugin,
  parseFileManagerPlugin,
  useIntent,
  useResolvePlugin,
} from '@dxos/app-framework';
import { create, isReactiveObject, getType, type EchoReactiveObject } from '@dxos/echo-schema';
import { Main, Button, ButtonGroup, useTranslation, toLocalizedString } from '@dxos/react-ui';
import { Path, type MosaicDropEvent, type MosaicMoveEvent, type MosaicDataItem } from '@dxos/react-ui-mosaic';
import {
  Stack,
  type StackProps,
  type CollapsedSections,
  type AddSectionPosition,
  type StackSectionItem,
} from '@dxos/react-ui-stack';
import {
  baseSurface,
  topbarBlockPaddingStart,
  getSize,
  surfaceElevation,
  staticDefaultButtonColors,
} from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { FileUpload } from './FileUpload';
import { STACK_PLUGIN } from '../meta';

const SectionContent: StackProps['SectionContent'] = ({ data }) => {
  // TODO(wittjosiah): Better section placeholder.
  return <Surface role='section' data={{ object: data }} placeholder={<></>} />;
};

type StackMainProps = {
  collection: Collection;
  separation?: boolean;
};

// find or create stack view
// create computed utility to map stack view + collection + other data into stack schema
//   - this will resolve the fallback title issue
//   - this will resolve the custom actions issue (pull custom actions from metadata plugin)
//   - provide record in stack section schema for arbitrary view data
// how do mutations map back to echo?

const StackMain = ({ collection, separation }: StackMainProps) => {
  const { dispatch } = useIntent();
  const { graph } = useGraph();
  const { t } = useTranslation(STACK_PLUGIN);
  const metadataPlugin = useResolvePlugin(parseMetadataResolverPlugin);
  const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);
  const defaultStack = useMemo(() => create(StackView, { sections: {} }), [collection]);
  const stack = (collection.views[StackView.typename] as StackView) ?? defaultStack;
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({});

  useEffect(() => {
    if (!collection.views[StackView.typename]) {
      collection.views[StackView.typename] = stack;
    }
  }, [collection, stack]);

  const id = `stack-${collection.id}`;
  const items =
    collection.objects
      // TODO(wittjosiah): Should the database handle this differently?
      // TODO(wittjosiah): Render placeholders for missing objects so they can be removed from the stack?
      .filter(nonNullable)
      .map((object) => {
        const metadata = metadataPlugin?.provides.metadata.resolver(
          getType(object)?.itemId ?? 'never',
        ) as StackSectionItem['metadata'];
        const view = {
          ...stack.sections[object.id],
          collapsed: collapsedSections[object.id],
          title: object.title ?? toLocalizedString(graph.findNode(object.id)?.properties.label, t),
        } as StackSectionItem['view'];
        return { id: object.id, object, metadata, view };
      }) ?? [];

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const data = parseData ? parseData(active.item, 'object') : active.item;

    // TODO(wittjosiah): Prevent dropping items which don't have a section renderer?
    //  Perhaps stack plugin should just provide a fallback section renderer.
    if (!isReactiveObject(data) || data instanceof StackView) {
      return 'reject';
    }

    const exists = items.findIndex(({ id }) => id === active.item.id) >= 0;
    if (!exists) {
      return 'copy';
    } else {
      return 'reject';
    }
  };

  const handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
    if (
      (active.path === Path.create(id, active.item.id) || active.path === id) &&
      (operation !== 'copy' || over.path === Path.create(id, over.item.id) || over.path === id)
    ) {
      collection.objects.splice(active.position!, 1);
      delete stack.sections[active.item.id];
    }

    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const object = parseData?.(active.item, 'object');
    if (object && over.path === Path.create(id, over.item.id)) {
      collection.objects.splice(over.position!, 0, object);
    } else if (object && over.path === id) {
      collection.objects.push(object);
    }

    if (!stack.sections[object.id]) {
      // TODO(wittjosiah): Throws.
      // stack.sections[object.id] = {};
    }
  };

  const handleDelete = (path: string) => {
    const index = collection.objects.filter(nonNullable).findIndex((section) => section.id === Path.last(path));
    if (index >= 0) {
      collection.objects.splice(index, 1);
      delete stack.sections[Path.last(path)];
    }
  };

  const handleAdd = (sectionObject: EchoReactiveObject<any>) => {
    collection.objects.push(sectionObject);
    // TODO(wittjosiah): Throws.
    // stack.sections[sectionObject.id] = {};
  };

  // TODO(wittjosiah): Factor out.
  const handleFileUpload = fileManagerPlugin?.provides.file.upload
    ? async (file: File) => {
        const filename = file.name.split('.')[0];
        const info = await fileManagerPlugin.provides.file.upload?.(file);
        if (info) {
          const obj = create(FileType, { type: file.type, title: filename, filename, cid: info.cid });
          handleAdd(obj);
        }
      }
    : undefined;

  const handleNavigate = async (id: string) => {
    await dispatch({
      action: NavigationAction.ACTIVATE,
      data: { id },
    });
  };

  const handleTransform = (item: MosaicDataItem, type?: string) => {
    const parseData = type && metadataPlugin?.provides.metadata.resolver(type)?.parse;
    return parseData ? parseData(item, 'view-object') : item;
  };

  const handleAddSection = (path: string, position: AddSectionPosition) => {
    void dispatch?.({
      action: LayoutAction.SET_LAYOUT,
      data: {
        element: 'dialog',
        component: `${STACK_PLUGIN}/AddSectionDialog`,
        subject: { path, position, collection },
      },
    });
  };

  const handleCollapseSection = (id: string, collapsed: boolean) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: collapsed }));
  };

  return (
    <Main.Content bounce classNames={[baseSurface, topbarBlockPaddingStart]}>
      <Stack
        id={id}
        data-testid='main.stack'
        SectionContent={SectionContent}
        type={Section.identifier}
        items={items}
        separation={separation}
        transform={handleTransform}
        onDrop={handleDrop}
        onOver={handleOver}
        onDeleteSection={handleDelete}
        onNavigateToSection={handleNavigate}
        onAddSection={handleAddSection}
        onCollapseSection={handleCollapseSection}
      />

      <div role='none' className='flex justify-center mbs-4 pbe-4'>
        <ButtonGroup classNames={[surfaceElevation({ elevation: 'group' }), staticDefaultButtonColors]}>
          <Button
            variant='ghost'
            data-testid='stack.createSection'
            onClick={() =>
              dispatch?.({
                action: LayoutAction.SET_LAYOUT,
                data: {
                  element: 'dialog',
                  component: 'dxos.org/plugin/stack/AddSectionDialog',
                  subject: { position: 'afterAll', collection },
                },
              })
            }
          >
            <Plus className={getSize(6)} />
          </Button>
          {handleFileUpload && (
            <FileUpload
              fileTypes={[...defaultFileTypes.images, ...defaultFileTypes.media, ...defaultFileTypes.text]}
              onUpload={handleFileUpload}
            />
          )}
        </ButtonGroup>
      </div>
    </Main.Content>
  );
};

export default StackMain;
