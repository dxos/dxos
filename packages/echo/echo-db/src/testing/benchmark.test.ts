import { ObjectModel } from "@dxos/object-model";
import { ECHO } from "../echo"

it.only('Database benchmark', async () => {
  const echo = new ECHO()
  await echo.open();
  await echo.halo.createProfile()
  const party = await echo.createParty()

  for(let i = 0; i < 10; i++) {
    const item = await party.database.createItem({ model: ObjectModel, type: 'test:item' })

    console.log(i)

    for(let j = 0; j < 1_000; j++) {
      await item.model.set(`key${j % 100}`, `value-${j}`)
    }
  }

  await echo.close()
})