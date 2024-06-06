//
// Copyright 2024 DXOS.org
//

import { Collection, getSpaceProperty, setSpaceProperty } from '@braneframe/types';
import * as automerge from '@dxos/automerge/automerge';
import { CreateEpochRequest } from '@dxos/client/halo';
import { type AutomergeContext, AutomergeObjectCore, loadObjectReferences } from '@dxos/echo-db';
import { type ObjectStructure, type SpaceDoc } from '@dxos/echo-protocol';
import { create, Expando, ref, requireTypeReference, S, TypedObject } from '@dxos/echo-schema';
import { Migrations, type Migration } from '@dxos/migrations';
import { type FlushRequest } from '@dxos/protocols/proto/dxos/echo/service';
import { Filter, type Space } from '@dxos/react-client/echo';
import { getDeep } from '@dxos/util';

export class FolderType extends TypedObject({ typename: 'braneframe.Folder', version: '0.1.0' })({
  name: S.optional(S.String),
  objects: S.mutable(S.Array(ref(Expando))),
}) {}

export class SectionType extends TypedObject({ typename: 'braneframe.Stack.Section', version: '0.1.0' })({
  object: ref(Expando),
}) {}

export class StackType extends TypedObject({ typename: 'braneframe.Stack', version: '0.1.0' })({
  title: S.optional(S.String),
  sections: S.mutable(S.Array(ref(SectionType))),
}) {}

export const migrations: Migration[] = [
  {
    version: 1,
    up: async ({ space }) => {
      const rootFolder = getSpaceProperty(space, FolderType.typename);
      if (rootFolder instanceof FolderType) {
        return;
      }

      const { objects } = await space.db.query(Filter.schema(FolderType, { name: space.key.toHex() })).run();
      if (objects.length > 0) {
        setSpaceProperty(space, FolderType.typename, objects[0]);
      } else {
        setSpaceProperty(space, FolderType.typename, create(FolderType, { name: space.key.toHex(), objects: [] }));
      }
    },
    down: () => {},
  },
  {
    version: 2,
    up: async ({ space }) => {
      const rootFolder = getSpaceProperty<FolderType>(space, FolderType.typename)!;
      const { objects } = await space.db.query(Filter.schema(FolderType, { name: space.key.toHex() })).run();
      if (objects.length <= 1) {
        return;
      }
      rootFolder.name = '';
      rootFolder.objects = objects.flatMap(({ objects }) => Array.from(objects));
      objects.forEach((object) => {
        if (object !== rootFolder) {
          space.db.remove(object);
        }
      });
    },
    down: () => {},
  },
  {
    version: 3,
    up: async ({ space }) => {
      /*
      - Epoch for atomicty
      - Not loading reference content where not needed
      - Preserving IDs while chaging the schema
      */

      // Find all folders and stacks.
      const { objects: folders } = await space.db.query(Filter.schema(FolderType)).run();
      const { objects: stacks } = await space.db.query(Filter.schema(StackType)).run();

      const builder = new MigrationBuilder(space);

      for (const folderId of folders.map((f) => f.id)) {
        const folderDocHandle = repo.find(rootDoc.links![folderId] as any);
        await folderDocHandle.whenReady();
        const folderDoc = (folderDocHandle.docSync() as automerge.Doc<SpaceDoc>).objects![folderId];

        const core = new AutomergeObjectCore();
        core.id = folderId;
        core.initNewObject({
          name: folderDoc.data.name,
          objects: folderDoc.data.objects,
          views: {},
        });
        core.setType(requireTypeReference(Collection));
        builder.addObject(core);
      }

      for (const stack of stacks) {
        const stackId = stack.id;

        const sections = await loadObjectReferences(stack, (s) => s.sections);
        const sectionIds = sections.map((s) => s.id);

        // TODO(wittjosiah): Delete sections.
        const sectionStructures: ObjectStructure[] = [];
        for (const sectionId of sectionIds) {
          const sectionDocHandle = repo.find(rootDoc.links![sectionId] as any);
          await sectionDocHandle.whenReady();
          const sectionDoc = (sectionDocHandle.docSync()! as automerge.Doc<SpaceDoc>).objects![sectionId];
          sectionStructures.push(sectionDoc);
        }

        const stackDocHandle = repo.find(rootDoc.links![stackId] as any);
        await stackDocHandle.whenReady();
        const stackDoc = (stackDocHandle.docSync()! as automerge.Doc<SpaceDoc>).objects![stackId];

        const core = new AutomergeObjectCore();
        core.id = stackId;
        core.initNewObject({
          name: stackDoc.data.title,
          objects: sectionStructures.map((section) => section.data.object),
          views: {},
        });
        core.setType(requireTypeReference(Collection));
        builder.addObject(core);
      }

      builder.buildNewRoot();

      // TODO(wittjosiah): This should be done by @dxos/migrations.
      builder.changeProperties((propertiesStructure) => {
        propertiesStructure.data[Migrations.versionProperty!] = 4;
        const prevRootFolder = getDeep(propertiesStructure.data, FolderType.typename!.split('.'));
        propertiesStructure.data[Collection.typename] = prevRootFolder ? { ...prevRootFolder } : null;
      });

      await builder.commit();
    },
    down: () => {},
  },
];

class MigrationBuilder {
  private readonly _repo: Repo;
  private readonly _automergeContext: AutomergeContext;
  private readonly _rootDoc: DocHandle<SpaceDoc>;

  /**
   * echoId -> automergeUrl
   */
  private readonly _newLinks: Record<string, string> = {};
  private readonly _flushStates: FlushRequest.DocState[] = [];

  private _newRoot?: DocHandle<SpaceDoc> = undefined;

  constructor(private readonly _space: Space) {
    this._repo = space.db.automerge.automerge.repo;
    this._automergeContext = space.db.automerge.automerge;
    this._rootDoc = space.db.automerge._automergeDocLoader.getSpaceRootDocHandle().docSync() as automerge.Doc<SpaceDoc>;
  }

  addObject(core: AutomergeObjectCore) {
    const newHandle = repo.create<SpaceDoc>({
      access: {
        spaceKey: space.key.toHex(),
      },
      objects: {
        [folderId]: core.getDoc(),
      },
    });
    this._newLinks[folderId] = newHandle.url;
    this._flushStates.push({
      documentId: newHandle.documentId,
      heads: automerge.getHeads(newHandle.docSync()!),
    });
  }

  buildNewRoot() {
    this._newRoot = repo.create<SpaceDoc>({
      access: {
        spaceKey: space.key.toHex(),
      },
      objects: this._rootDoc.objects,
      links: {
        ...this._rootDoc.links,
        ...this._newLinks,
      },
    });
    this._flushStates.push({
      documentId: newRoot.documentId,
      heads: automerge.getHeads(newRoot.docSync()!),
    });
  }

  changeProperties(changeFn: (properties: ObjectStructure) => void) {
    invariant(this._newRoot);
    this._newRoot.change((doc: SpaceDoc) => {
      const propertiesStructure = doc.objects![space.properties.id];
      changeFn(propertiesStructure);
    });
    this._flushStates.push({
      documentId: this._newRoot.documentId,
      heads: automerge.getHeads(this._newRoot.docSync()!),
    });
  }

  async commit() {
    await this._automergeContext.flush({
      states: flushStates,
    });

    // Create new epoch.
    await this._space.internal.createEpoch({
      migration: CreateEpochRequest.Migration.REPLACE_AUTOMERGE_ROOT,
      automergeRootUrl: newRoot.url,
    });
  }
}
