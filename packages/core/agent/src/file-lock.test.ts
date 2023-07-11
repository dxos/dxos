import { sleep } from "@dxos/async"
import { log } from "@dxos/log"
import { describe, test } from "@dxos/test"
import chai, { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import { flock } from 'fs-ext'
import { spawn } from "node:child_process"
import { FileHandle, constants, open } from "node:fs/promises"
import { join } from "node:path"

chai.use(chaiAsPromised)

const lock = async (filename: string): Promise<FileHandle> => {
  const handle = await open(filename, constants.O_CREAT)
  await new Promise<void>((resolve, reject) => {
    flock(handle.fd, 'exnb', (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
  return handle
}

const unlock = async (handle: FileHandle) => {
  await new Promise<void>((resolve, reject) => {
    flock(handle.fd, 'un', (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
  await handle.close()
}


describe.only('FileLocking', () => {
  test('basic', async () => {
    const filename = join('/tmp', `lock-${Math.random()}.lock`)

    const handle = await lock(filename)
    await expect(lock(filename)).to.be.rejected;

    await unlock(handle)

    log.break()

    const handle2 = await lock(filename)
    await unlock(handle2)
  })

  test('released when process exists', async () => {
    const filename = join('/tmp', `lock-${Math.random()}.lock`)

    // TODO(dmaretskyi): Self-contained so when function.toString is called the code runs.
    // @ts-ignore
    function lockInProcess(filename) {
      const { open, constants } = require('node:fs/promises')
      const { flock } = require('fs-ext')

      // @ts-ignore
      open(filename, constants.O_CREAT).then((handle) => {
        // @ts-ignore
        flock(handle.fd, 'exnb', (err) => {
          if (err) {
            console.error(err)
            return
          }
          // Hang
          setTimeout(() => {}, 1_000_000)
        })
      })
    }


    const processHandle = spawn('node', ['-e', `(${lockInProcess.toString()})(${JSON.stringify(filename)})`], { stdio: 'inherit' })

    // Wait for process to start
    await sleep(50)

    await expect(lock(filename)).to.be.rejected;
    
    processHandle.kill()

    // Wait for process to be killed  
    await sleep(50)

    const handle = await lock(filename)
    await unlock(handle)
  })
})