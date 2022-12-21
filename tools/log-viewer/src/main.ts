import { app, BrowserWindow } from 'electron'

const main = async () => {
  await app.whenReady()
  const win = new BrowserWindow({
    width: 800,
    height: 600
  })

  win.loadFile(require.resolve('./index.html'))
}
main()