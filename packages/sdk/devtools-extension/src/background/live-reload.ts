//
// Copyright 2021 DXOS.org
//

import browser from 'webextension-polyfill';

const filesInDirectory = (dir: FileSystemDirectoryEntry): Promise<File[]> => new Promise(resolve =>
  dir.createReader().readEntries(entries =>
    Promise.all(entries.filter(e => e.name[0] !== '.').map(e =>
      e.isDirectory
        ? filesInDirectory(e as FileSystemDirectoryEntry)
        : new Promise<File[]>(resolve => (e as FileSystemFileEntry).file(file => resolve([file])))
    ))
      .then(files => ([] as File[]).concat(...files))
      .then(resolve)
  )
);

const timestampForFilesInDirectory = (dir: FileSystemDirectoryEntry) =>
  filesInDirectory(dir).then(files =>
    files.map(f => f.name + (f as any).lastModifiedDate).join());

const watchChanges = async (dir: FileSystemDirectoryEntry, lastTimestamp?: string) => {
  const timestamp = await timestampForFilesInDirectory(dir);
  if (!lastTimestamp || (lastTimestamp === timestamp)) {
    setTimeout(() => watchChanges(dir, timestamp), 1000); // retry after 1s
  } else {
    console.log('Reloading extension..');
    browser.runtime.reload();
  }
};

export async function startLiveReload () {
  const self = await browser.management.getSelf();

  if (self.installType === 'development') {
    chrome.runtime.getPackageDirectoryEntry(dir => watchChanges(dir));
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => { // NB: see https://github.com/xpl/crx-hotreload/issues/5
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id!);
      }
    });
  }
}
