import { createPersistentInstance } from "../src/persistant-instance";
import { join } from "path";
import { rmSync } from 'fs'
import { ObjectModel } from "@dxos/object-model";

(async () => {
  const storagePath = join(__dirname, '../saved-state');

  try {
    rmSync(storagePath, { recursive: true, force: true });
  } catch (err) { }

  const echo = createPersistentInstance(storagePath);
  await echo.open();
  await echo.halo.createProfile({
    username: 'Test profile',
  });

  const party = await echo.createParty();
  const person = await party.database.createItem({ model: ObjectModel, type: 'dxos:item.person', props: { firstName: 'Edith', lastName: 'Finch' } });
  await person.model.setProperty('lastName', 'Smith');
  
  // TODO(dmaretskyi): Invitations do not work.
  // const otherPeer = new ECHO();
  // await otherPeer.open();
  // await otherPeer.halo.createProfile({ username: 'Other profile' });
  // const invitation = await party.createInvitation();
  // await otherPeer.joinParty(invitation);
  // await otherPeer.close();

  const company = await party.database.createItem({ model: ObjectModel, type: 'dxos:item.company', props: { name: 'DXOS' } });
  await party.database.createLink({ type: 'dxos:link.employee', source: person, target: company });

  await echo.close();
})();