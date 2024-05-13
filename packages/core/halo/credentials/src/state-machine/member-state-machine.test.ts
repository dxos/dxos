//
// Copyright 2024 DXOS.org
//
import { expect } from 'chai';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { MemberStateMachine } from './member-state-machine';
import { createAdmissionCredentials, createCredentialSignerWithKey } from '../credentials';

const keyring = new Keyring();

describe.only('MemberStateMachine', () => {
  const genesisFeedKey: PublicKey = PublicKey.random();

  let spaceKey: PublicKey;
  beforeEach(async () => {
    spaceKey = await keyring.createKey();
  });

  test('first member is the owner if no explicit credential', async () => {
    const stateMachine = createStateMachine();
    const [A, B] = await createPeers(2);
    await admit(stateMachine, spaceKey, A, [], SpaceMember.Role.ADMIN);
    await admit(stateMachine, spaceKey, B, [], SpaceMember.Role.ADMIN);
    expectOwnerAndAdmins(stateMachine, [A, B]);
  });

  test('owner removal forbidden', async () => {
    const stateMachine = createStateMachine();
    const [A, B] = await createPeers(2);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    await remove(stateMachine, B, A, [aAdmitB]);
    expectOwnerAndAdmins(stateMachine, [A, B]);
  });

  test('non-member credential ignored', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C] = await createPeers(3);
    const spaceCreated = await createSpace(stateMachine, A);
    await admit(stateMachine, B, C, [spaceCreated]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.REMOVED],
      [C, SpaceMember.Role.REMOVED],
    ]);
  });

  test('non-admin admission ignored', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C] = await createPeers(3);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated], SpaceMember.Role.EDITOR);
    await admit(stateMachine, B, C, [aAdmitB]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.EDITOR],
      [C, SpaceMember.Role.REMOVED],
    ]);
  });

  test('own role update forbidden', async () => {
    const stateMachine = createStateMachine();
    const [A, B] = await createPeers(2);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated], SpaceMember.Role.ADMIN);
    await updateRole(stateMachine, B, B, SpaceMember.Role.EDITOR, [aAdmitB]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.ADMIN],
    ]);
  });

  /*
               +-------+
          +--->|Admit A|<----------+
          |    +-------+  |        |
        +-------+  +-------+  +-------+
        |Admit B|  |Admit C|  |Admit D|
        +-------+  +-------+  +-------+
   */
  test('leaf fork is merged', async () => {
    const stateMachine = createStateMachine();
    const actors = await createPeers(4);
    const spaceCreated = await createSpace(stateMachine, actors[0]);
    for (const guest of actors.slice(1)) {
      await admit(stateMachine, actors[0], guest, [spaceCreated]);
    }
    expectOwnerAndAdmins(stateMachine, actors);
  });

  /*
               +-------+
          +--->|Admit A|<----------+
          |    +-------+  |        |
        +-+-----+  +-------+  +-------+
        |Admit B|  |Admit C|  |Admit D|
        +-------+  +-------+  +-------+
          ^            ^          ^
          |    +---------+        |
          +----|D admit E|--------+
               +---------+
   */
  test('middle fork is merged', async () => {
    const stateMachine = createStateMachine();
    const actors = await createPeers(5);
    const [A, B, C, D, E] = actors;
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const aAdmitC = await admit(stateMachine, A, C, [spaceCreated]);
    const aAdmitD = await admit(stateMachine, A, D, [spaceCreated]);
    await admit(stateMachine, D, E, [aAdmitB, aAdmitC, aAdmitD]);
    expectOwnerAndAdmins(stateMachine, actors);
  });

  /*
              +---------+
              | Admit A |
              +---------+
              +---^-------+
              | A admit B |
              +-----------+
              +----^------+
           +->+ B admit C +<-+
           |  +-----------+  |
          ++--------+    +---+-----+
          |C admit E|    |C admit D|
          +---------+    +---------+
          +----^-----+
          |B remove C|
          +----------+
   */
  test('D is removed because invite was concurrent with C removal, but E is a member', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D, E] = await createPeers(5);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const bAdmitC = await admit(stateMachine, A, C, [aAdmitB]);
    const cAdmitE = await admit(stateMachine, C, E, [bAdmitC]);
    await admit(stateMachine, C, D, [bAdmitC]);
    await remove(stateMachine, B, C, [cAdmitE]);
    expectRoles(stateMachine, [
      [B, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.ADMIN],
      [C, SpaceMember.Role.REMOVED],
      [D, SpaceMember.Role.REMOVED],
    ]);
  });

  /*
                  +---------+
                  | Admit A |
                  +---------+
                  +---^-----+
                  |A admit B|
                  +---------+
                  +---^-----+
             +--->|A admit C|<----------+
             |    +---------+   |       |
          +----------++----------+ +----+----+
          |B remove C|| C admit E| |A admit E|
          +----------++----------+ +---------+
          +--^-------+
          |A admit D |
          +----------+
   */
  test('E was invited in 2 branches one of which was discarded - E is a member', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D, E] = await createPeers(5);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const aAdmitC = await admit(stateMachine, A, C, [aAdmitB]);
    const bRemoveC = await remove(stateMachine, B, C, [aAdmitC]);
    await admit(stateMachine, A, D, [bRemoveC]);
    await admit(stateMachine, A, E, [aAdmitC]);
    await admit(stateMachine, C, E, [aAdmitC]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.ADMIN],
      [D, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.ADMIN],
      [C, SpaceMember.Role.REMOVED],
    ]);
  });

  /*
              +---------+
              | Admit A |
              +---------+
              +-----------+
              | A admit B |
              +-----------+
              +-----------+
           +->+ B admit C +<-+
           |  +-----------+  |
          ++--------+    +---+-----+
          |C admit E|    |C admit D|
          +---------+    +---------+
          +----------+   +---------+
          |B remove C|   |A admit F|
          +----------+   +---------+
   */
  test('D invite was discarded, but F joined', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D, E, F] = await createPeers(6);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const bAdmitC = await admit(stateMachine, A, C, [aAdmitB]);
    const cAdmitE = await admit(stateMachine, C, E, [bAdmitC]);
    const cAdmitD = await admit(stateMachine, C, D, [bAdmitC]);
    await remove(stateMachine, B, C, [cAdmitE]);
    await admit(stateMachine, A, F, [cAdmitD]);
    expectRoles(stateMachine, [
      [B, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.ADMIN],
      [F, SpaceMember.Role.ADMIN],
      [C, SpaceMember.Role.REMOVED],
      [D, SpaceMember.Role.REMOVED],
    ]);
  });

  /*
                        +---------+
                   +--->| Admit A |<---+
                   |    +---------+    |
              +---------+         +---------+
           +->|A admit C|<+     +>|A admit B|<-+
           |  +---------+ |     | +---------+  |
        +---------+ +---------+ +---------+ +----------+
        |C admit E| |C admit D| |B admit F| |A remove C|
        +---------+ +---------+ +---------+ +----------+
                                            +----^-----+
                                            | B admit G|
                                            +----------+
                                            +----^-----+
                                            | G admit H|
                                            +----------+
   */
  test('E and D are not members because C was removed in a parallel longer branch', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D, E, F, G, H] = await createPeers(8);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const aAdmitC = await admit(stateMachine, A, C, [spaceCreated]);
    await admit(stateMachine, C, E, [aAdmitC]);
    await admit(stateMachine, C, D, [aAdmitC]);
    await admit(stateMachine, B, F, [aAdmitB]);
    const aRemoveC = await remove(stateMachine, A, C, [aAdmitB]);
    const bAdmitG = await admit(stateMachine, B, G, [aRemoveC]);
    await admit(stateMachine, G, H, [bAdmitG]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.ADMIN],
      [C, SpaceMember.Role.REMOVED],
      [D, SpaceMember.Role.REMOVED],
      [F, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.REMOVED],
    ]);
  });

  /*
                +---------+
                | Admit A |
                +---------+
                +---------+
                |A admit B|
                +---------+
                +---------+
           +--->|A admit C|<-------------+
           |    +---------+    |         |
        +--+-------+    +---------+ +---------+
        |B remove C|    |C admit E| |B admit F|
        +----------+    +---------+ +--+------+
        +--^-------+    +-----^----+   ^
        |A admit D |    |E remove F|   |
        +----------+    +----------+   |
        +--^-------+        +-^---------+
        |D admit G |        | E admit H |
        +----------+        +-----------+
        +--^-------+
        |G admit I |
        +----------+
   */
  test('F is not a member in subbranch, but becomes a member when branch with C removal is discovered', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D, E, F, G, H, I] = await createPeers(9);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const aAdmitC = await admit(stateMachine, A, C, [aAdmitB]);
    const bAdmitF = await admit(stateMachine, B, F, [aAdmitC]);
    const cAdmitE = await admit(stateMachine, C, E, [aAdmitC]);
    const eRemoveF = await remove(stateMachine, E, F, [cAdmitE]);
    await admit(stateMachine, E, H, [eRemoveF, bAdmitF]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.ADMIN],
      [C, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.ADMIN],
      [F, SpaceMember.Role.REMOVED],
    ]);
    const bRemoveC = await remove(stateMachine, B, C, [aAdmitC]);
    const aAdmitD = await admit(stateMachine, A, D, [bRemoveC]);
    const dAdmitG = await admit(stateMachine, D, G, [aAdmitD]);
    await admit(stateMachine, G, I, [dAdmitG]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.ADMIN],
      [F, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.REMOVED],
      [C, SpaceMember.Role.REMOVED],
    ]);
  });

  /*
                +---------+
                | Admit A |
                +---------+
                +---------+
                |A admit B|
                +---------+
                +---------+
           +--->|A admit C|<-------------+
           |    +---------+    |         |
        +--+-------+    +---------+ +---------+
        |B remove C|    |C admit E| |A admit F|
        +----------+    +---------+ +--+------+
        +--^-------+    +-----^----+
        |A admit D |    |E remove F|
        +----------+    +----------+
        +--^-------+
        |D admit G |
        +----------+
        +--^-------+
        |G admit H |
        +----------+
   */
  test('F is a member because concurrent branch gets removed by a longer branch', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D, E, F, G, H] = await createPeers(8);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const aAdmitC = await admit(stateMachine, A, C, [aAdmitB]);
    const cAdmitE = await admit(stateMachine, C, E, [aAdmitC]);
    await remove(stateMachine, E, F, [cAdmitE]);
    await admit(stateMachine, A, F, [aAdmitC]);
    const bRemoveC = await remove(stateMachine, B, C, [aAdmitC]);
    const aAdmitD = await admit(stateMachine, A, D, [bRemoveC]);
    const dAdmitG = await admit(stateMachine, D, G, [aAdmitD]);
    await admit(stateMachine, G, H, [dAdmitG]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.ADMIN],
      [F, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.REMOVED],
      [C, SpaceMember.Role.REMOVED],
    ]);
  });

  /*
                    +-------+
               +--->|Admit A|<--+
               |    +-------+   |
               |                |
            +---------+   +---------+
            |A admit B|   |A admit C|<----+
            +---------+   +---------+     |
               ^             ^            |
            +---------+      |       +---------+
            |B admit E|      |       |C admit D|
            +---------+      |       +---------+
               ^    +----------+
               +----+E remove C|
                    +----------+
   */
  test('D is removed because C was removed in a longer branch', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D, E] = await createPeers(5);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const aAdmitC = await admit(stateMachine, A, C, [spaceCreated]);
    const bAdmitE = await admit(stateMachine, B, E, [aAdmitB]);
    await admit(stateMachine, C, D, [aAdmitC]);
    await remove(stateMachine, E, C, [bAdmitE, aAdmitC]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.ADMIN],
      [C, SpaceMember.Role.REMOVED],
      [D, SpaceMember.Role.REMOVED],
    ]);
  });

  /**
                   +-------+
                   |Admit A|
                   +-------+
           +--------^+   +^--------+
           |A admit B|   |A admit C|
           +-----^---+   +-----^---+
                 |             |
                 +-------------+
                 |             |
           +----------+  +---------+
           |B remove C|  |C admit D|
           +----------+  +---------+
   */
  test('D is removed because D auth was authorized by a credential revoked in a concurrent branch', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D] = await createPeers(4);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const aAdmitC = await admit(stateMachine, A, C, [spaceCreated]);
    await admit(stateMachine, C, D, [aAdmitB, aAdmitC]);
    await remove(stateMachine, B, C, [aAdmitB, aAdmitC]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [B, SpaceMember.Role.ADMIN],
      [C, SpaceMember.Role.REMOVED],
      [D, SpaceMember.Role.REMOVED],
    ]);
  });

  /*
                                 +-------+
                                 |Admit A|
                                 +-------+
                                   ^   ^
                +---------+        |   |   +---------+
                |A admit B|--------+   +---|A admit G|<----------+
                +---------+                +---------+           |
        +--------^+   +^--------+             +-----^---+  +---------+
        |B admit C|   |B admit D|             |G admit H|  |G admit K|
        +---------+   +---------+             +---------+  +---------+
        +--------^+     ^    ^   +---------+  +-----^---+  +----^----+
        |C admit E|     |    +---|D admit F|  |H admit I|  |K admit L|
        +---------+     |        +---------+  +---------+  +---------+
          ^    +----------+              ^    +-----^---+
          +----+E remove D|              |    |I admit J|
               +----------+              |    +---------+
                                        +----------+   ^
                                        |J remove K|---+
                                        +----------+
   */
  test('combined case', async () => {
    const stateMachine = createStateMachine();
    const [A, B, C, D, E, F, G, H, I, J, K, L] = await createPeers(12);
    const spaceCreated = await createSpace(stateMachine, A);
    const aAdmitB = await admit(stateMachine, A, B, [spaceCreated]);
    const bAdmitC = await admit(stateMachine, B, C, [aAdmitB]);
    const cAdmitE = await admit(stateMachine, C, E, [bAdmitC]);
    const bAdmitD = await admit(stateMachine, B, D, [aAdmitB]);
    const dAdmitF = await admit(stateMachine, D, F, [bAdmitD]);
    await remove(stateMachine, E, D, [bAdmitD, cAdmitE]);
    expectRoles(stateMachine, [
      [A, SpaceMember.Role.OWNER],
      [C, SpaceMember.Role.ADMIN],
      [E, SpaceMember.Role.ADMIN],
      [B, SpaceMember.Role.ADMIN],
      [D, SpaceMember.Role.REMOVED],
      [F, SpaceMember.Role.REMOVED],
    ]);
    const aAdmitG = await admit(stateMachine, A, G, [spaceCreated]);
    const gAdmitK = await admit(stateMachine, G, K, [aAdmitG]);
    await admit(stateMachine, K, L, [gAdmitK]);
    const gAdmitH = await admit(stateMachine, G, H, [aAdmitG]);
    const hAdmitI = await admit(stateMachine, H, I, [gAdmitH]);
    const iAdmitJ = await admit(stateMachine, I, J, [hAdmitI]);
    await remove(stateMachine, J, K, [dAdmitF, iAdmitJ]);
    expectOwnerAndAdmins(stateMachine, [A, B, C, E, G, H, I, J]);
    expectRoles(stateMachine, [
      [L, SpaceMember.Role.REMOVED],
      [K, SpaceMember.Role.REMOVED],
      [D, SpaceMember.Role.REMOVED],
      [F, SpaceMember.Role.REMOVED],
    ]);
  });

  const createSpace = async (stateMachine: MemberStateMachine, creator: PublicKey): Promise<PublicKey> => {
    return admit(stateMachine, spaceKey, creator, [], SpaceMember.Role.OWNER);
  };

  const updateRole = (
    stateMachine: MemberStateMachine,
    host: PublicKey,
    guest: PublicKey,
    role?: SpaceMember.Role,
    parents?: PublicKey[],
  ) => {
    return admit(stateMachine, host, guest, parents, role);
  };

  const admit = async (
    stateMachine: MemberStateMachine,
    host: PublicKey,
    guest: PublicKey,
    parents?: PublicKey[],
    role?: SpaceMember.Role,
  ): Promise<PublicKey> => {
    const signer = createCredentialSignerWithKey(keyring, host);
    const feedMessage = await createAdmissionCredentials(
      signer,
      guest,
      spaceKey,
      genesisFeedKey,
      role ?? SpaceMember.Role.ADMIN,
      parents,
    );
    const credential = feedMessage[0].credential!.credential;
    await stateMachine.process(credential);
    return feedMessage[0].credential!.credential.id!;
  };

  const remove = async (
    stateMachine: MemberStateMachine,
    remover: PublicKey,
    removed: PublicKey,
    parents?: PublicKey[],
  ): Promise<PublicKey> => {
    const signer = createCredentialSignerWithKey(keyring, remover);
    const feedMessage = await createAdmissionCredentials(
      signer,
      removed,
      spaceKey,
      genesisFeedKey,
      SpaceMember.Role.REMOVED,
      parents,
    );
    const credential = feedMessage[0].credential!.credential;
    await stateMachine.process(credential);
    return feedMessage[0].credential!.credential.id!;
  };

  const createPeers = (count: number) => Promise.all(range(count).map(() => keyring.createKey()));

  const createStateMachine = () => new MemberStateMachine(spaceKey);

  const expectOwnerAndAdmins = (stateMachine: MemberStateMachine, ownerAndAdmins: PublicKey[]) => {
    expectRoles(stateMachine, [
      [ownerAndAdmins[0], SpaceMember.Role.OWNER],
      ...ownerAndAdmins.slice(1).map((key) => [key, SpaceMember.Role.ADMIN] as [PublicKey, SpaceMember.Role]),
    ]);
  };

  const expectRoles = (stateMachine: MemberStateMachine, expectation: Array<[PublicKey, SpaceMember.Role]>) => {
    for (let i = 0; i < expectation.length; i++) {
      const expected = expectation[i];
      expect(stateMachine.getRole(expected[0]), `failed at index ${i}`).to.eq(expected[1]);
    }
  };
});
