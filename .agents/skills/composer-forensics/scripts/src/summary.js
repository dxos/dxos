//
// Copyright 2026 DXOS.org
//

import { collectAutomergeDocumentStats } from './automerge.js';
import { all, countRows, get, openDatabase, tableExists } from './db.js';
import { decodeEchoMetadata, formatPublicKey, summarizeSpace } from './metadata.js';

const formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${bytes} B`;
};

/**
 * Prints a human-readable profile summary.
 *
 * @param {string} dbPath
 */
export const printProbeSummary = (dbPath) => {
  const db = openDatabase(dbPath);

  console.log('Composer forensics probe');
  console.log('========================');
  console.log(`database: ${dbPath}`);
  console.log(`journal_mode: ${get(db, 'PRAGMA journal_mode')?.journal_mode ?? 'unknown'}`);
  console.log('');

  const integrity = get(db, 'PRAGMA integrity_check')?.integrity_check;
  if (integrity === 'ok') {
    console.log('integrity_check: ok');
  } else {
    console.log('integrity_check: WARN (hot copy or corruption — close Chrome and re-extract for clean check)');
    if (integrity) {
      console.log(String(integrity).split('\n').slice(0, 5).join('\n'));
    }
  }
  console.log('');

  // Identity + spaces from EchoMetadata blob.
  const metadataRow = get(db, "SELECT value FROM space_metadata WHERE key = 'main'");
  const metadata = metadataRow?.value ? decodeEchoMetadata(metadataRow.value) : null;

  console.log('Identity');
  console.log('--------');
  if (!metadata?.identity) {
    console.log('  (no identity record in space_metadata.main)');
  } else {
    const { identity } = metadata;
    console.log(`  identity_key: ${formatPublicKey(identity.identityKey) ?? '(missing)'}`);
    console.log(`  device_key:   ${formatPublicKey(identity.deviceKey) ?? '(missing)'}`);
    const profileName = identity.profile?.displayName ?? identity.profile?.display_name;
    if (profileName) {
      console.log(`  display_name: ${profileName}`);
    }
  }
  console.log('');

  const spaces = metadata?.spaces ?? [];
  const deletedSpaces = metadata?.deletedSpaces ?? metadata?.deleted_spaces ?? [];
  console.log('Spaces (metadata)');
  console.log('-----------------');
  console.log(`  active:   ${spaces.length}`);
  console.log(`  deleted:  ${deletedSpaces.length}`);
  console.log(`  version:  ${metadata?.version ?? '(unknown)'}`);
  for (const space of spaces) {
    const summary = summarizeSpace(space);
    console.log(`  - ${summary.key ?? '?'} state=${summary.state ?? '?'} feeds=${summary.feedCount}`);
  }
  console.log('');

  console.log('Storage counts');
  console.log('--------------');
  const counts = [
    ['feeds', countRows(db, 'feeds')],
    ['blocks', countRows(db, 'blocks')],
    ['objectMeta', countRows(db, 'objectMeta')],
    ['objectMeta (deleted)', countRows(db, 'objectMeta') ? Number(get(db, 'SELECT COUNT(*) AS n FROM objectMeta WHERE deleted != 0')?.n ?? 0) : 0],
    ['automerge_heads', countRows(db, 'automerge_heads')],
    ['automerge_chunks', countRows(db, 'automerge_chunks')],
    ['blobs_meta', countRows(db, 'blobs_meta')],
    ['keyring keys', countRows(db, 'keyring')],
    ['hypercore_files', countRows(db, 'hypercore_files')],
  ];
  for (const [label, value] of counts) {
    console.log(`  ${label.padEnd(24)} ${value}`);
  }

  const automergeBytes = Number(get(db, 'SELECT COALESCE(SUM(LENGTH(data)), 0) AS n FROM automerge_chunks')?.n ?? 0);
  console.log(`  ${'automerge chunk bytes'.padEnd(24)} ${formatBytes(automergeBytes)}`);
  console.log('');

  if (tableExists(db, 'objectMeta')) {
    console.log('Objects by space (top 10)');
    console.log('---------------------------');
    const rows = all(
      db,
      `SELECT spaceId, COUNT(*) AS objects, SUM(CASE WHEN deleted != 0 THEN 1 ELSE 0 END) AS deleted
       FROM objectMeta
       GROUP BY spaceId
       ORDER BY objects DESC
       LIMIT 10`,
    );
    for (const row of rows) {
      console.log(`  ${row.spaceId}  objects=${row.objects} deleted=${row.deleted}`);
    }
    console.log('');
  }

  if (tableExists(db, 'feeds')) {
    console.log('Feeds by space (top 10)');
    console.log('-----------------------');
    const rows = all(
      db,
      `SELECT f.spaceId, COUNT(DISTINCT f.feedId) AS feeds, COUNT(b.insertionId) AS blocks
       FROM feeds f
       LEFT JOIN blocks b ON b.feedPrivateId = f.feedPrivateId
       GROUP BY f.spaceId
       ORDER BY blocks DESC
       LIMIT 10`,
    );
    for (const row of rows) {
      console.log(`  ${row.spaceId}  feeds=${row.feeds} blocks=${row.blocks}`);
    }
    console.log('');
  }

  const automergeStats = collectAutomergeDocumentStats(db);
  console.log('Automerge documents');
  console.log('-------------------');
  console.log(`  documents (heads table): ${automergeStats.documentsWithHeads}`);
  console.log(`  documents (chunk keys):  ${automergeStats.documentsWithChunks}`);
  console.log(`  total chunks:            ${automergeStats.totalChunks}`);
  console.log(`  total bytes:             ${formatBytes(automergeStats.totalBytes)}`);
  console.log('');
  console.log('Run `automerge list-ids` for full document id listing.');
};
