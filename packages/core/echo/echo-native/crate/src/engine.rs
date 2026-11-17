//! One space's database: its objects' Automerge documents stored as feed blocks, and the index the
//! query compiler reads (`objectMeta`, `objectSnapshot`, `reverseRef`), written in the same transaction.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::rc::Rc;
use std::str::FromStr;
use std::sync::Arc;
use std::time::Instant;

use automerge::{AutoCommit, ChangeHash};
use serde_json::Value as Json;
use turso_core::{ConnectOpts, Database};
use turso_sqlite::SqliteDialect;

use crate::doc;
use crate::sql::{Cell, Db, Param, SqlResult};
use crate::wire::{Reader, Value, Writer};

pub const AUTOMERGE_NAMESPACE: &str = "automerge";

/// Rows per multi-row statement; 22 columns × 40 rows stays well inside SQLite's variable limit.
const ROWS_PER_STATEMENT: usize = 40;

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS blocks (
  insertionId INTEGER PRIMARY KEY,
  namespace TEXT NOT NULL,
  feedId TEXT NOT NULL,
  actorId TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  prevActorId TEXT,
  prevSequence INTEGER,
  position INTEGER,
  timestamp INTEGER NOT NULL,
  data BLOB NOT NULL,
  UNIQUE (feedId, actorId, sequence)
);
CREATE INDEX IF NOT EXISTS blocks_feed ON blocks (feedId, sequence);
CREATE INDEX IF NOT EXISTS blocks_position ON blocks (namespace, position);
CREATE TABLE IF NOT EXISTS sync_state (namespace TEXT PRIMARY KEY, lastPulled INTEGER NOT NULL, serverToken TEXT);
CREATE TABLE IF NOT EXISTS objectMeta (
  recordId INTEGER PRIMARY KEY,
  objectId TEXT NOT NULL,
  queueId TEXT NOT NULL DEFAULT '',
  queueNamespace TEXT NOT NULL DEFAULT '',
  spaceId TEXT NOT NULL,
  documentId TEXT NOT NULL DEFAULT '',
  entityKind TEXT NOT NULL,
  typeDXN TEXT NOT NULL,
  deleted INTEGER NOT NULL,
  source TEXT,
  target TEXT,
  parent TEXT,
  version INTEGER NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER,
  queuePosition INTEGER,
  convergenceKey TEXT,
  parentId TEXT,
  sourceId TEXT,
  targetId TEXT,
  annotations TEXT,
  queueInsertionId INTEGER,
  queueBranch TEXT
);
CREATE INDEX IF NOT EXISTS idx_object_index_objectId ON objectMeta (spaceId, objectId);
CREATE INDEX IF NOT EXISTS idx_object_index_typeDXN ON objectMeta (spaceId, typeDXN);
CREATE INDEX IF NOT EXISTS echo_sqlite_object_type ON objectMeta (spaceId, typeDXN, objectId);
CREATE INDEX IF NOT EXISTS idx_object_index_parentId ON objectMeta (spaceId, parentId);
CREATE INDEX IF NOT EXISTS idx_object_index_sourceId ON objectMeta (spaceId, sourceId);
CREATE INDEX IF NOT EXISTS idx_object_index_targetId ON objectMeta (spaceId, targetId);
CREATE INDEX IF NOT EXISTS idx_object_index_queueObjectId ON objectMeta (spaceId, queueId, objectId);
CREATE TABLE IF NOT EXISTS objectSnapshot (recordId INTEGER PRIMARY KEY, snapshot TEXT NOT NULL, heads TEXT, bytes BLOB, version TEXT);
CREATE TABLE IF NOT EXISTS reverseRef (
  recordId INTEGER NOT NULL,
  targetDXN TEXT NOT NULL,
  propPath TEXT NOT NULL,
  propPathNormalized TEXT,
  PRIMARY KEY (recordId, targetDXN, propPath)
);
CREATE INDEX IF NOT EXISTS idx_reverse_ref_target ON reverseRef (targetDXN);
CREATE INDEX IF NOT EXISTS idx_reverse_ref_record ON reverseRef (recordId);
CREATE TABLE IF NOT EXISTS echo_sqlite_redirects (spaceId TEXT NOT NULL, fromId TEXT NOT NULL, toId TEXT NOT NULL, PRIMARY KEY (spaceId, fromId));
CREATE TABLE IF NOT EXISTS echo_sqlite_changes (spaceId TEXT NOT NULL, objectId TEXT NOT NULL, hash TEXT NOT NULL, actor TEXT NOT NULL, seq INTEGER NOT NULL, time INTEGER NOT NULL, ops INTEGER NOT NULL, PRIMARY KEY (spaceId, objectId, hash));
CREATE INDEX IF NOT EXISTS echo_sqlite_changes_time ON echo_sqlite_changes (spaceId, time);
"#;

/// What every connection to one file shares: the database, and the counters rows are numbered by.
pub struct FileState {
    pub database: Arc<Database>,
    next_record_id: i64,
    next_version: i64,
}

pub type SharedFile = Rc<RefCell<FileState>>;

impl FileState {
    pub fn open(database: Arc<Database>) -> SqlResult<SharedFile> {
        let conn = database.connect(ConnectOpts::new()).map_err(|err| err.to_string())?;
        let mut db = Db::new(conn);
        db.exec_batch(SCHEMA)?;
        let mut max_record = 0;
        let mut max_version = 0;
        db.query("SELECT MAX(recordId), MAX(version) FROM objectMeta", &[], |row| {
            max_record = row[0].int().unwrap_or(0);
            max_version = row[1].int().unwrap_or(0);
            Ok(())
        })?;
        Ok(Rc::new(RefCell::new(FileState {
            database,
            next_record_id: max_record + 1,
            next_version: max_version + 1,
        })))
    }
}

struct CachedDoc {
    doc: AutoCommit,
    /// Heads every stored block covers; a write appends the changes after them.
    saved: Vec<ChangeHash>,
    /// Edited in memory by `edit` with changes no block holds yet.
    unsaved: bool,
}

/// A block to insert, local or pulled.
struct BlockRow {
    feed_id: String,
    actor_id: String,
    sequence: i64,
    prev_actor_id: Option<String>,
    prev_sequence: Option<i64>,
    position: Option<i64>,
    timestamp: i64,
    data: Vec<u8>,
}

/// Time spent per phase since open, in microseconds, for the benchmark report.
#[derive(Default)]
pub struct Profile {
    pub automerge_change: u64,
    pub automerge_save: u64,
    pub automerge_load: u64,
    pub blocks_sql: u64,
    pub index_read: u64,
    pub index_sql: u64,
    pub changes: u64,
    pub transaction: u64,
}

fn micros(since: Instant) -> u64 {
    since.elapsed().as_micros() as u64
}

pub struct Engine {
    pub profile: Profile,
    db: Db,
    file: SharedFile,
    space_id: String,
    actor_id: String,
    docs: HashMap<String, CachedDoc>,
    /// The newest block of each feed, which the next local block names as its predecessor.
    heads: HashMap<String, (i64, String)>,
    record_ids: HashMap<String, i64>,
    /// Each document's heads when its changes were last logged, so the next pass reads only newer ones.
    logged: HashMap<String, Vec<ChangeHash>>,
    /// Documents written or pulled whose changes are not logged yet.
    unlogged: HashSet<String>,
}

/// One change of a document, as `echo_sqlite_changes` logs it for change queries.
struct ChangeRow {
    object_id: String,
    hash: String,
    actor: String,
    seq: i64,
    time: i64,
    ops: i64,
}

fn feed_of(object_id: &str) -> String {
    format!("doc:{object_id}")
}

fn object_of(feed_id: &str) -> Option<&str> {
    feed_id.strip_prefix("doc:")
}

fn placeholders(rows: usize, columns: usize) -> String {
    let row = format!("({})", vec!["?"; columns].join(", "));
    vec![row; rows].join(", ")
}

fn parse_heads(heads: &[String]) -> Result<Vec<ChangeHash>, String> {
    heads.iter().map(|head| ChangeHash::from_str(head).map_err(|err| err.to_string())).collect()
}

fn heads_json(heads: &[ChangeHash]) -> String {
    let list: Vec<Json> = heads.iter().map(|head| Json::String(head.to_string())).collect();
    Json::Array(list).to_string()
}

impl Engine {
    pub fn open(file: SharedFile, space_id: String, actor_id: String) -> SqlResult<Engine> {
        let conn = file.borrow().database.connect(ConnectOpts::new()).map_err(|err| err.to_string())?;
        Ok(Engine {
            profile: Profile::default(),
            db: Db::new(conn),
            file,
            space_id,
            actor_id,
            docs: HashMap::new(),
            heads: HashMap::new(),
            record_ids: HashMap::new(),
            logged: HashMap::new(),
            unlogged: HashSet::new(),
        })
    }

    pub fn statements(&self) -> u64 {
        self.db.statements
    }

    fn in_transaction<T>(&mut self, body: impl FnOnce(&mut Engine) -> SqlResult<T>) -> SqlResult<T> {
        let start = Instant::now();
        self.db.execute("BEGIN", &[])?;
        self.profile.transaction += micros(start);
        match body(self) {
            Ok(value) => {
                let start = Instant::now();
                self.db.execute("COMMIT", &[])?;
                self.profile.transaction += micros(start);
                Ok(value)
            }
            Err(error) => {
                let _ = self.db.execute("ROLLBACK", &[]);
                // Cached documents and heads may be ahead of the rolled-back file.
                self.docs.clear();
                self.heads.clear();
                self.record_ids.clear();
                Err(error)
            }
        }
    }

    /// Loads the documents of `ids` that are not cached, with one statement per chunk; an id with no
    /// blocks has no document. Also learns each loaded feed's newest block.
    fn load_docs(&mut self, ids: &[String]) -> SqlResult<()> {
        let missing: Vec<String> = ids.iter().filter(|id| !self.docs.contains_key(*id)).cloned().collect();
        for chunk in missing.chunks(ROWS_PER_STATEMENT) {
            let sql = format!(
                "SELECT feedId, actorId, sequence, data FROM blocks WHERE feedId IN ({}) ORDER BY insertionId",
                vec!["?"; chunk.len()].join(", ")
            );
            let params: Vec<Param> = chunk.iter().map(|id| Param::Text(feed_of(id))).collect();
            let mut chunks: HashMap<String, Vec<u8>> = HashMap::new();
            let mut heads: HashMap<String, (i64, String)> = HashMap::new();
            self.db.query(&sql, &params, |row| {
                let feed = row[0].text().unwrap_or_default().to_owned();
                let actor = row[1].text().unwrap_or_default();
                let sequence = row[2].int().unwrap_or(0);
                chunks.entry(feed.clone()).or_default().extend_from_slice(row[3].blob().unwrap_or_default());
                let newer = heads.get(&feed).is_none_or(|(seq, act)| (sequence, actor) > (*seq, act.as_str()));
                if newer {
                    heads.insert(feed, (sequence, actor.to_owned()));
                }
                Ok(())
            })?;
            for (feed, bytes) in chunks {
                let Some(id) = object_of(&feed) else { continue };
                let start = Instant::now();
                let mut loaded = AutoCommit::load(&bytes).map_err(|err| err.to_string())?;
                let saved = loaded.get_heads();
                self.profile.automerge_load += micros(start);
                self.docs.insert(id.to_owned(), CachedDoc { doc: loaded, saved, unsaved: false });
            }
            self.heads.extend(heads);
        }
        Ok(())
    }

    fn feed_head(&self, feed: &str) -> Option<(i64, String)> {
        self.heads.get(feed).cloned()
    }

    fn insert_blocks(&mut self, namespace: &str, blocks: &[BlockRow], adopt_positions: bool) -> SqlResult<()> {
        for chunk in blocks.chunks(ROWS_PER_STATEMENT) {
            let conflict = if adopt_positions {
                "ON CONFLICT (feedId, actorId, sequence) DO UPDATE SET position = excluded.position"
            } else {
                "ON CONFLICT (feedId, actorId, sequence) DO NOTHING"
            };
            let sql = format!(
                "INSERT INTO blocks (namespace, feedId, actorId, sequence, prevActorId, prevSequence, position, timestamp, data) VALUES {} {}",
                placeholders(chunk.len(), 9),
                conflict
            );
            let mut params = Vec::with_capacity(chunk.len() * 9);
            for block in chunk {
                params.push(Param::from(namespace));
                params.push(Param::Text(block.feed_id.clone()));
                params.push(Param::Text(block.actor_id.clone()));
                params.push(Param::Int(block.sequence));
                params.push(Param::from(block.prev_actor_id.clone()));
                params.push(Param::from(block.prev_sequence));
                params.push(Param::from(block.position));
                params.push(Param::Int(block.timestamp));
                params.push(Param::Blob(block.data.clone()));
            }
            self.db.execute(&sql, &params)?;
        }
        Ok(())
    }

    /// Writes each object's structure into its document, appends one block per changed document, and
    /// indexes the result, all in one transaction. Output: per object its new heads and whether the
    /// write merged with changes it had not seen.
    pub fn write(&mut self, input: &mut Reader<'_>, out: &mut Writer) -> SqlResult<()> {
        let now = input.f64()?;
        let count = input.u32()? as usize;
        let mut writes = Vec::with_capacity(count);
        for _ in 0..count {
            let id = input.str()?.to_owned();
            let heads = read_heads(input)?;
            let structure = input.value()?;
            writes.push((id, heads, structure));
        }
        let purged_count = input.u32()? as usize;
        let mut purged = Vec::with_capacity(purged_count);
        for _ in 0..purged_count {
            purged.push(input.str()?.to_owned());
        }
        self.in_transaction(|engine| {
            let ids: Vec<String> = writes.iter().map(|(id, _, _)| id.clone()).collect();
            engine.load_docs(&ids)?;
            let mut blocks = Vec::new();
            let mut results: Vec<(String, Vec<ChangeHash>, bool)> = Vec::new();
            for (id, heads, structure) in &writes {
                let is_new = !engine.docs.contains_key(id);
                let space_id = engine.space_id.clone();
                let cached = engine.docs.entry(id.clone()).or_insert_with(|| CachedDoc {
                    doc: AutoCommit::new(),
                    saved: Vec::new(),
                    unsaved: false,
                });
                let heads = match heads {
                    Some(heads) => Some(parse_heads(heads)?),
                    None => None,
                };
                let start = Instant::now();
                let behind =
                    doc::write_object(&mut cached.doc, is_new, &space_id, id, structure, heads.as_deref(), now)?;
                let changed = micros(start);
                let start = Instant::now();
                let chunk = cached.doc.save_after(&cached.saved);
                cached.saved = cached.doc.get_heads();
                engine.profile.automerge_save += micros(start);
                engine.profile.automerge_change += changed;
                cached.unsaved = false;
                let new_heads = cached.saved.clone();
                if !chunk.is_empty() {
                    let feed = feed_of(id);
                    let previous = engine.feed_head(&feed);
                    let sequence = previous.as_ref().map(|(seq, _)| seq + 1).unwrap_or(0);
                    engine.heads.insert(feed.clone(), (sequence, engine.actor_id.clone()));
                    blocks.push(BlockRow {
                        feed_id: feed,
                        actor_id: engine.actor_id.clone(),
                        sequence,
                        prev_actor_id: previous.as_ref().map(|(_, actor)| actor.clone()),
                        prev_sequence: previous.map(|(seq, _)| seq),
                        position: None,
                        timestamp: now as i64,
                        data: chunk,
                    });
                }
                match results.iter_mut().find(|(existing, _, _)| existing == id) {
                    Some(result) => {
                        result.1 = new_heads;
                        result.2 |= behind;
                    }
                    None => results.push((id.clone(), new_heads, behind)),
                }
            }
            let start = Instant::now();
            engine.insert_blocks(AUTOMERGE_NAMESPACE, &blocks, false)?;
            engine.profile.blocks_sql += micros(start);
            if !purged.is_empty() {
                engine.purge(&purged)?;
            }
            let updated: HashMap<String, i64> = ids.iter().map(|id| (id.clone(), now as i64)).collect();
            let indexed = engine.index(&updated)?;
            out.u32(results.len() as u32);
            for (id, heads, behind) in &results {
                out.str(id);
                write_heads(out, heads);
                out.u8(u8::from(*behind));
                out.f64(now);
            }
            out.u32(indexed.len() as u32);
            for id in &indexed {
                out.str(id);
            }
            Ok(())
        })
    }

    /// Applies writes to cached documents without appending; the next write of each object appends
    /// them with its own. Writes nothing (count 0) when an object read at some heads is not cached.
    pub fn edit(&mut self, input: &mut Reader<'_>, out: &mut Writer) -> SqlResult<()> {
        let now = input.f64()?;
        let count = input.u32()? as usize;
        let mut writes = Vec::with_capacity(count);
        for _ in 0..count {
            let id = input.str()?.to_owned();
            let heads = read_heads(input)?;
            let structure = input.value()?;
            writes.push((id, heads, structure));
        }
        let ids: Vec<String> = writes.iter().map(|(id, _, _)| id.clone()).collect();
        self.load_docs(&ids)?;
        if writes.iter().any(|(id, heads, _)| !self.docs.contains_key(id) && heads.as_ref().is_some_and(|h| !h.is_empty())) {
            out.u32(0);
            return Ok(());
        }
        let mut results: Vec<(String, Vec<ChangeHash>, bool)> = Vec::new();
        for (id, heads, structure) in &writes {
            let is_new = !self.docs.contains_key(id);
            let space_id = self.space_id.clone();
            let cached = self.docs.entry(id.clone()).or_insert_with(|| CachedDoc {
                doc: AutoCommit::new(),
                saved: Vec::new(),
                unsaved: false,
            });
            let heads = match heads {
                Some(heads) => Some(parse_heads(heads)?),
                None => None,
            };
            let behind = doc::write_object(&mut cached.doc, is_new, &space_id, id, structure, heads.as_deref(), now)?;
            cached.unsaved = true;
            results.push((id.clone(), cached.doc.get_heads(), behind));
        }
        out.u32(results.len() as u32);
        for (id, heads, behind) in &results {
            out.str(id);
            write_heads(out, heads);
            out.u8(u8::from(*behind));
            out.f64(now);
        }
        Ok(())
    }

    /// An object's whole document, saved, for history reads; empty when it has none.
    pub fn document(&mut self, id: &str, out: &mut Writer) -> SqlResult<()> {
        self.load_docs(&[id.to_owned()])?;
        match self.docs.get_mut(id) {
            Some(cached) => out.bytes(&cached.doc.save()),
            None => out.bytes(&[]),
        }
        Ok(())
    }

    /// Drops cached documents so their next read loads every block (after another writer appended).
    pub fn invalidate(&mut self, ids: &[String]) {
        for id in ids {
            if self.docs.get(id).is_some_and(|cached| !cached.unsaved) {
                self.docs.remove(id);
            }
            self.heads.remove(&feed_of(id));
        }
    }

    fn purge(&mut self, ids: &[String]) -> SqlResult<()> {
        for id in ids {
            let mut record = None;
            self.db.query(
                "SELECT recordId FROM objectMeta WHERE spaceId = ? AND objectId = ? AND queueId = ''",
                &[Param::Text(self.space_id.clone()), Param::Text(id.clone())],
                |row| {
                    record = row[0].int();
                    Ok(())
                },
            )?;
            if let Some(record) = record {
                for sql in [
                    "DELETE FROM objectMeta WHERE recordId = ?",
                    "DELETE FROM objectSnapshot WHERE recordId = ?",
                    "DELETE FROM reverseRef WHERE recordId = ?",
                ] {
                    self.db.execute(sql, &[Param::Int(record)])?;
                }
            }
            self.db.execute("DELETE FROM blocks WHERE feedId = ?", &[Param::Text(feed_of(id))])?;
            self.docs.remove(id);
            self.heads.remove(&feed_of(id));
            self.record_ids.remove(id);
        }
        Ok(())
    }

    /// Re-indexes the objects of the documents in `updated` (document id → last change time): their
    /// meta, snapshot and reference rows, with a fixed number of statements per chunk of objects.
    fn index(&mut self, updated: &HashMap<String, i64>) -> SqlResult<Vec<String>> {
        let documents: Vec<String> = updated.keys().cloned().collect();
        self.load_docs(&documents)?;
        let space_id = self.space_id.clone();

        struct Row {
            record_id: i64,
            object_id: String,
            document_id: String,
            kind: &'static str,
            type_dxn: String,
            deleted: i64,
            source: Option<String>,
            target: Option<String>,
            parent: Option<String>,
            parent_id: Option<String>,
            source_id: Option<String>,
            target_id: Option<String>,
            convergence_key: Option<String>,
            annotations: Option<String>,
            version: i64,
            created_at: i64,
            updated_at: i64,
            snapshot: String,
            heads: String,
            refs: Vec<(String, String, String)>,
        }

        let read_start = Instant::now();
        let mut entries: Vec<(String, String, Json, String, i64)> = Vec::new();
        for document_id in &documents {
            let Some(cached) = self.docs.get_mut(document_id) else { continue };
            let current = cached.doc.get_heads();
            // Logged when a change query asks, not on every write or pull: reading a document's change
            // metadata costs about as much as indexing it, and most writes are never queried that way.
            self.unlogged.insert(document_id.clone());
            let heads = heads_json(&current);
            for object_id in doc::object_ids(&cached.doc)? {
                if let Some(structure) = doc::read_structure(&cached.doc, &object_id)? {
                    let updated_at = updated.get(document_id).copied().unwrap_or(0);
                    entries.push((document_id.clone(), object_id, structure, heads.clone(), updated_at));
                }
            }
        }

        self.profile.index_read += micros(read_start);
        let sql_start = Instant::now();
        let unknown: Vec<String> =
            entries.iter().map(|entry| entry.1.clone()).filter(|id| !self.record_ids.contains_key(id)).collect();
        for chunk in unknown.chunks(ROWS_PER_STATEMENT) {
            let sql = format!(
                "SELECT objectId, recordId FROM objectMeta WHERE spaceId = ? AND queueId = '' AND objectId IN ({})",
                vec!["?"; chunk.len()].join(", ")
            );
            let mut params = vec![Param::Text(space_id.clone())];
            params.extend(chunk.iter().map(|id| Param::Text(id.clone())));
            let mut found = Vec::new();
            self.db.query(&sql, &params, |row| {
                found.push((row[0].text().unwrap_or_default().to_owned(), row[1].int().unwrap_or(0)));
                Ok(())
            })?;
            self.record_ids.extend(found);
        }

        let mut rows: Vec<Row> = Vec::with_capacity(entries.len());
        let mut indexed = Vec::new();
        {
            let mut file = self.file.borrow_mut();
            for (document_id, object_id, structure, heads, updated_at) in entries {
                let json = doc::structure_to_json(&object_id, &structure);
                let record_id = match self.record_ids.get(&object_id) {
                    Some(id) => *id,
                    None => {
                        let id = file.next_record_id;
                        file.next_record_id += 1;
                        self.record_ids.insert(object_id.clone(), id);
                        id
                    }
                };
                let version = file.next_version;
                file.next_version += 1;
                let text = |key: &str| json.get(key).and_then(|value| value.as_str()).map(str::to_owned);
                let source = text("@relationSource");
                let kind = if source.is_some() { "relation" } else { "object" };
                let target = if kind == "relation" { text("@relationTarget") } else { None };
                let parent = text("@parent");
                let meta = json.get("@meta");
                let convergence_key =
                    meta.and_then(|meta| meta.get("convergenceKey")).and_then(|key| key.as_str()).map(str::to_owned);
                let annotations = meta
                    .and_then(|meta| meta.get("annotations"))
                    .filter(|value| value.as_object().is_some_and(|map| !map.is_empty()))
                    .map(|value| value.to_string());
                let created_at = structure
                    .get("system")
                    .and_then(|system| system.get("createdAt"))
                    .and_then(|value| value.as_f64())
                    .map(|value| value as i64)
                    .unwrap_or(updated_at);
                let type_dxn = doc::normalize_type_uri(&text("@type").unwrap_or_else(|| "type".to_owned()));
                rows.push(Row {
                    record_id,
                    parent_id: doc::local_entity_id(parent.as_deref(), &space_id),
                    source_id: doc::local_entity_id(source.as_deref(), &space_id),
                    target_id: doc::local_entity_id(target.as_deref(), &space_id),
                    deleted: i64::from(json.get("@deleted").and_then(|value| value.as_bool()).unwrap_or(false)),
                    refs: doc::extract_references(&json),
                    snapshot: json.to_string(),
                    object_id: object_id.clone(),
                    document_id,
                    kind,
                    type_dxn,
                    source,
                    target,
                    parent,
                    convergence_key,
                    annotations,
                    version,
                    created_at,
                    updated_at,
                    heads,
                });
                indexed.push(object_id);
            }
        }

        for chunk in rows.chunks(ROWS_PER_STATEMENT) {
            let sql = format!(
                "INSERT INTO objectMeta (recordId, objectId, queueId, queueNamespace, spaceId, documentId, entityKind, typeDXN, deleted, source, target, parent, parentId, sourceId, targetId, convergenceKey, annotations, version, createdAt, updatedAt) VALUES {} \
                 ON CONFLICT (recordId) DO UPDATE SET entityKind = excluded.entityKind, typeDXN = excluded.typeDXN, deleted = excluded.deleted, source = excluded.source, target = excluded.target, parent = excluded.parent, parentId = excluded.parentId, sourceId = excluded.sourceId, targetId = excluded.targetId, convergenceKey = excluded.convergenceKey, annotations = excluded.annotations, version = excluded.version, updatedAt = excluded.updatedAt",
                placeholders(chunk.len(), 20)
            );
            let mut params = Vec::with_capacity(chunk.len() * 20);
            for row in chunk {
                params.extend([
                    Param::Int(row.record_id),
                    Param::Text(row.object_id.clone()),
                    Param::from(""),
                    Param::from(""),
                    Param::Text(space_id.clone()),
                    Param::Text(row.document_id.clone()),
                    Param::from(row.kind),
                    Param::Text(row.type_dxn.clone()),
                    Param::Int(row.deleted),
                    Param::from(row.source.clone()),
                    Param::from(row.target.clone()),
                    Param::from(row.parent.clone()),
                    Param::from(row.parent_id.clone()),
                    Param::from(row.source_id.clone()),
                    Param::from(row.target_id.clone()),
                    Param::from(row.convergence_key.clone()),
                    Param::from(row.annotations.clone()),
                    Param::Int(row.version),
                    Param::Int(row.created_at),
                    Param::Int(row.updated_at),
                ]);
            }
            self.db.execute(&sql, &params)?;

            let sql = format!(
                "INSERT INTO objectSnapshot (recordId, snapshot, version) VALUES {} ON CONFLICT (recordId) DO UPDATE SET snapshot = excluded.snapshot, version = excluded.version",
                placeholders(chunk.len(), 3)
            );
            let mut params = Vec::with_capacity(chunk.len() * 3);
            for row in chunk {
                params.extend([Param::Int(row.record_id), Param::Text(row.snapshot.clone()), Param::Text(row.heads.clone())]);
            }
            self.db.execute(&sql, &params)?;

            let sql = format!(
                "DELETE FROM reverseRef WHERE recordId IN ({})",
                vec!["?"; chunk.len()].join(", ")
            );
            let params: Vec<Param> = chunk.iter().map(|row| Param::Int(row.record_id)).collect();
            self.db.execute(&sql, &params)?;

            let refs: Vec<(i64, &(String, String, String))> =
                chunk.iter().flat_map(|row| row.refs.iter().map(move |reference| (row.record_id, reference))).collect();
            let mut seen = HashSet::new();
            let refs: Vec<_> = refs.into_iter().filter(|(record, (target, path, _))| seen.insert((*record, target.clone(), path.clone()))).collect();
            for refs_chunk in refs.chunks(ROWS_PER_STATEMENT * 2) {
                let sql = format!(
                    "INSERT INTO reverseRef (recordId, targetDXN, propPath, propPathNormalized) VALUES {}",
                    placeholders(refs_chunk.len(), 4)
                );
                let mut params = Vec::with_capacity(refs_chunk.len() * 4);
                for (record, (target, path, normalized)) in refs_chunk {
                    params.extend([
                        Param::Int(*record),
                        Param::Text(target.clone()),
                        Param::Text(path.clone()),
                        Param::Text(normalized.clone()),
                    ]);
                }
                self.db.execute(&sql, &params)?;
            }
        }
        self.profile.index_sql += micros(sql_start);
        Ok(indexed)
    }

    /// Logs the changes of every document written or pulled since the last call into
    /// `echo_sqlite_changes`, reading only the changes after the heads logged before.
    pub fn log_changes(&mut self) -> SqlResult<()> {
        if self.unlogged.is_empty() {
            return Ok(());
        }
        let documents: Vec<String> = self.unlogged.drain().collect();
        let start = Instant::now();
        self.load_docs(&documents)?;
        let space_id = self.space_id.clone();
        let mut changes: Vec<ChangeRow> = Vec::new();
        for document_id in &documents {
            let Some(cached) = self.docs.get_mut(document_id) else { continue };
            let since = self.logged.get(document_id).cloned().unwrap_or_default();
            for change in cached.doc.get_changes(&since) {
                if change.timestamp() > 0 {
                    changes.push(ChangeRow {
                        object_id: document_id.clone(),
                        hash: change.hash().to_string(),
                        actor: change.actor_id().to_hex_string(),
                        seq: change.seq() as i64,
                        time: change.timestamp() * 1000,
                        ops: (change.max_op() - change.start_op().get() + 1) as i64,
                    });
                }
            }
            self.logged.insert(document_id.clone(), cached.doc.get_heads());
        }
        self.in_transaction(|engine| {
            for chunk in changes.chunks(ROWS_PER_STATEMENT) {
                let sql = format!(
                    "INSERT OR IGNORE INTO echo_sqlite_changes (spaceId, objectId, hash, actor, seq, time, ops) VALUES {}",
                    placeholders(chunk.len(), 7)
                );
                let mut params = Vec::with_capacity(chunk.len() * 7);
                for change in chunk {
                    params.extend([
                        Param::Text(space_id.clone()),
                        Param::Text(change.object_id.clone()),
                        Param::Text(change.hash.clone()),
                        Param::Text(change.actor.clone()),
                        Param::Int(change.seq),
                        Param::Int(change.time),
                        Param::Int(change.ops),
                    ]);
                }
                engine.db.execute(&sql, &params)?;
            }
            Ok(())
        })?;
        self.profile.changes += micros(start);
        Ok(())
    }

    /// Runs one statement and writes its rows as a row table.
    pub fn query(&mut self, input: &mut Reader<'_>, out: &mut Writer) -> SqlResult<()> {
        let sql = input.str()?.to_owned();
        let count = input.u32()? as usize;
        let mut params = Vec::with_capacity(count);
        for _ in 0..count {
            params.push(match input.value()? {
                Value::Null => Param::Null,
                Value::Bool(value) => Param::Int(i64::from(value)),
                Value::Int(value) => Param::Int(value),
                Value::Float(value) => Param::Float(value),
                Value::Str(value) => Param::Text(value),
                Value::Bytes(value) => Param::Blob(value),
                other => Param::Text(format!("{other:?}")),
            });
        }
        // Property predicates evaluated here on each row's snapshot (column `body`): Turso's JSON
        // functions re-parse the text per call, which made a filtered scan cost ~3.6 µs per row.
        let predicates = read_predicates(input)?;
        if predicates.is_empty() {
            return self.db.query_table(&sql, &params, out, |_| true);
        }
        let body = self.db.column_index(&sql, "body")?;
        self.db.query_table(&sql, &params, out, |row| {
            let Some(text) = body.and_then(|index| row.get(index)).and_then(|cell| cell.text()) else {
                return false;
            };
            match serde_json::from_str::<Json>(text) {
                Ok(json) => predicates.iter().all(|predicate| predicate.matches(&json)),
                Err(_) => false,
            }
        })
    }

    //
    // Sync.
    //

    pub fn sync_state(&mut self, namespace: &str, out: &mut Writer) -> SqlResult<()> {
        let mut state: (i64, Option<String>) = (-1, None);
        self.db.query(
            "SELECT lastPulled, serverToken FROM sync_state WHERE namespace = ?",
            &[Param::from(namespace)],
            |row| {
                state = (row[0].int().unwrap_or(-1), row[1].text().map(str::to_owned));
                Ok(())
            },
        )?;
        out.f64(state.0 as f64);
        out.opt_str(state.1.as_deref());
        Ok(())
    }

    /// Forgets every position of a namespace and restarts its pull, after the authority was replaced.
    pub fn reset_sync(&mut self, input: &mut Reader<'_>) -> SqlResult<()> {
        let namespace = input.str()?.to_owned();
        let token = input.opt_str()?.map(str::to_owned);
        self.in_transaction(|engine| {
            engine.db.execute("UPDATE blocks SET position = NULL WHERE namespace = ?", &[Param::Text(namespace.clone())])?;
            engine.set_sync_state(&namespace, -1, token)
        })
    }

    fn set_sync_state(&mut self, namespace: &str, last_pulled: i64, token: Option<String>) -> SqlResult<()> {
        self.db.execute(
            "INSERT INTO sync_state (namespace, lastPulled, serverToken) VALUES (?, ?, ?) ON CONFLICT (namespace) DO UPDATE SET lastPulled = excluded.lastPulled, serverToken = excluded.serverToken",
            &[Param::from(namespace), Param::Int(last_pulled), Param::from(token)],
        )
    }

    /// Stores a pulled batch, records the pull cursor, and folds the blocks into the documents and the
    /// index, in one transaction. Output: the objects it re-indexed.
    pub fn apply_pulled(&mut self, input: &mut Reader<'_>, out: &mut Writer) -> SqlResult<()> {
        let namespace = input.str()?.to_owned();
        let token = input.opt_str()?.map(str::to_owned);
        let last_pulled = input.f64()? as i64;
        let count = input.u32()? as usize;
        let mut blocks = Vec::with_capacity(count);
        for _ in 0..count {
            let feed_id = input.str()?.to_owned();
            let actor_id = input.str()?.to_owned();
            let sequence = input.f64()? as i64;
            let prev_actor_id = input.opt_str()?.map(str::to_owned);
            let prev_sequence = input.f64()?;
            let position = input.f64()?;
            let timestamp = input.f64()? as i64;
            let data = input.bytes()?.to_vec();
            blocks.push(BlockRow {
                feed_id,
                actor_id,
                sequence,
                prev_actor_id,
                prev_sequence: (prev_sequence >= 0.0).then_some(prev_sequence as i64),
                position: (position >= 0.0).then_some(position as i64),
                timestamp,
                data,
            });
        }
        self.in_transaction(|engine| {
            let start = Instant::now();
            engine.insert_blocks(&namespace, &blocks, true)?;
            engine.profile.blocks_sql += micros(start);
            engine.set_sync_state(&namespace, last_pulled, token)?;
            let mut updated: HashMap<String, i64> = HashMap::new();
            if namespace == AUTOMERGE_NAMESPACE {
                for block in &blocks {
                    let Some(id) = object_of(&block.feed_id) else { continue };
                    let newer = engine
                        .heads
                        .get(&block.feed_id)
                        .is_some_and(|(seq, actor)| (block.sequence, block.actor_id.as_str()) > (*seq, actor.as_str()));
                    if newer {
                        engine.heads.insert(block.feed_id.clone(), (block.sequence, block.actor_id.clone()));
                    }
                    // A cached document takes the chunk now; one not cached reads every block on load.
                    if let Some(cached) = engine.docs.get_mut(id) {
                        cached.doc.load_incremental(&block.data).map_err(|err| err.to_string())?;
                        if !cached.unsaved {
                            cached.saved = cached.doc.get_heads();
                        }
                    }
                    let time = updated.entry(id.to_owned()).or_insert(0);
                    *time = (*time).max(block.timestamp);
                }
            }
            let indexed = engine.index(&updated)?;
            out.u32(indexed.len() as u32);
            for id in &indexed {
                out.str(id);
            }
            Ok(())
        })
    }

    /// Up to `limit` local blocks the authority has not positioned, oldest first.
    pub fn unpositioned(&mut self, input: &mut Reader<'_>, out: &mut Writer) -> SqlResult<()> {
        let namespace = input.str()?.to_owned();
        let limit = input.u32()? as i64;
        let count_at = out.len();
        out.u32(0);
        let mut count = 0u32;
        self.db.query(
            "SELECT insertionId, feedId, actorId, sequence, prevActorId, prevSequence, timestamp, data FROM blocks WHERE namespace = ? AND position IS NULL ORDER BY insertionId LIMIT ?",
            &[Param::Text(namespace), Param::Int(limit)],
            |row| {
                count += 1;
                out.f64(row[0].int().unwrap_or(0) as f64);
                out.str(row[1].text().unwrap_or_default());
                out.str(row[2].text().unwrap_or_default());
                out.f64(row[3].int().unwrap_or(0) as f64);
                out.opt_str(row[4].text());
                out.f64(row[5].int().map(|value| value as f64).unwrap_or(-1.0));
                out.f64(row[6].int().unwrap_or(0) as f64);
                out.bytes(row[7].blob().unwrap_or_default());
                Ok(())
            },
        )?;
        out.patch_u32(count_at, count);
        Ok(())
    }

    /// Records the positions the authority assigned to pushed blocks, by insertion id.
    pub fn set_positions(&mut self, input: &mut Reader<'_>) -> SqlResult<()> {
        let count = input.u32()? as usize;
        let mut pairs = Vec::with_capacity(count);
        for _ in 0..count {
            pairs.push((input.f64()? as i64, input.f64()? as i64));
        }
        self.in_transaction(|engine| {
            for chunk in pairs.chunks(ROWS_PER_STATEMENT) {
                let cases = vec!["WHEN ? THEN ?"; chunk.len()].join(" ");
                let sql = format!(
                    "UPDATE blocks SET position = CASE insertionId {cases} END WHERE insertionId IN ({})",
                    vec!["?"; chunk.len()].join(", ")
                );
                let mut params = Vec::with_capacity(chunk.len() * 3);
                for (insertion, position) in chunk {
                    params.push(Param::Int(*insertion));
                    params.push(Param::Int(*position));
                }
                params.extend(chunk.iter().map(|(insertion, _)| Param::Int(*insertion)));
                engine.db.execute(&sql, &params)?;
            }
            Ok(())
        })
    }
}

/// A comparison on one top-level property, with ECHO's strict typing: a number never equals a string.
struct Predicate {
    key: String,
    op: u8,
    operands: Vec<Json>,
}

impl Predicate {
    fn matches(&self, json: &Json) -> bool {
        let Some(value) = json.get(&self.key) else { return false };
        let compare = |operand: &Json| -> Option<std::cmp::Ordering> {
            match (value, operand) {
                (Json::Number(left), Json::Number(right)) => left.as_f64()?.partial_cmp(&right.as_f64()?),
                (Json::String(left), Json::String(right)) => Some(left.as_str().cmp(right.as_str())),
                (Json::Bool(left), Json::Bool(right)) => Some(left.cmp(right)),
                _ => None,
            }
        };
        use std::cmp::Ordering::{Equal, Greater, Less};
        match (self.op, self.operands.as_slice()) {
            (PREDICATE_EQ, [operand]) => compare(operand) == Some(Equal),
            (PREDICATE_GT, [operand]) => compare(operand) == Some(Greater),
            (PREDICATE_GTE, [operand]) => matches!(compare(operand), Some(Greater | Equal)),
            (PREDICATE_LT, [operand]) => compare(operand) == Some(Less),
            (PREDICATE_LTE, [operand]) => matches!(compare(operand), Some(Less | Equal)),
            (PREDICATE_BETWEEN, [from, to]) => {
                matches!(compare(from), Some(Greater | Equal)) && matches!(compare(to), Some(Less | Equal))
            }
            _ => false,
        }
    }
}

/// Predicate operators; `src/fast-query.ts` writes the same codes.
const PREDICATE_EQ: u8 = 0;
const PREDICATE_GT: u8 = 1;
const PREDICATE_GTE: u8 = 2;
const PREDICATE_LT: u8 = 3;
const PREDICATE_LTE: u8 = 4;
const PREDICATE_BETWEEN: u8 = 5;

fn read_predicates(input: &mut Reader<'_>) -> SqlResult<Vec<Predicate>> {
    // Absent from callers that send none.
    let count = match input.u32() {
        Ok(count) => count as usize,
        Err(_) => return Ok(Vec::new()),
    };
    let mut predicates = Vec::with_capacity(count);
    for _ in 0..count {
        let key = input.str()?.to_owned();
        let op = input.u8()?;
        let operands = (0..input.u32()?)
            .map(|_| {
                input.value().map(|value| match value {
                    Value::Int(number) => Json::from(number),
                    Value::Float(number) => serde_json::Number::from_f64(number).map(Json::Number).unwrap_or(Json::Null),
                    Value::Str(text) => Json::String(text),
                    Value::Bool(flag) => Json::Bool(flag),
                    _ => Json::Null,
                })
            })
            .collect::<Result<Vec<_>, _>>()?;
        predicates.push(Predicate { key, op, operands });
    }
    Ok(predicates)
}

fn read_heads(input: &mut Reader<'_>) -> SqlResult<Option<Vec<String>>> {
    let count = input.u32()?;
    if count == u32::MAX {
        return Ok(None);
    }
    let mut heads = Vec::with_capacity(count as usize);
    for _ in 0..count {
        heads.push(input.str()?.to_owned());
    }
    Ok(Some(heads))
}

fn write_heads(out: &mut Writer, heads: &[ChangeHash]) {
    out.u32(heads.len() as u32);
    for head in heads {
        out.str(&head.to_string());
    }
}

/// Opens (or reuses) the file at `path`: in memory for `:memory:`-like names, else through the
/// platform's file I/O.
pub fn open_database(path: &str) -> SqlResult<Arc<Database>> {
    let io: Arc<dyn turso_core::IO> = if path.starts_with("mem:") {
        Arc::new(turso_core::MemoryIO::new())
    } else {
        Arc::new(turso_core::PlatformIO::new().map_err(|err| err.to_string())?)
    };
    Database::open_file(io, path, Arc::new(SqliteDialect)).map_err(|err| err.to_string())
}

#[allow(dead_code)]
fn cell_text(cell: &Cell<'_>) -> Option<String> {
    cell.text().map(str::to_owned)
}
