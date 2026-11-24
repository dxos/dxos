//! Feed items: blocks of a Feed object's own feed (in the `data` or `trace` namespace) holding one
//! item's whole JSON each, indexed as echo-sqlite's item leg does, and trimmed by the feed's retention.

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{Map as JsonMap, Value as Json};

use super::{placeholders, BlockRow, Engine};
use crate::doc;
use crate::sql::{Param, SqlResult};

/// Meta key sources a store stamps on an item it reads; see echo-protocol's `EchoFeedCodec`.
const KEY_QUEUE_POSITION: &str = "org.dxos.key.queue-position";
const KEY_FEED_BLOCK: &str = "org.dxos.key.feed-block";
const KEY_FEED_BRANCH: &str = "org.dxos.key.feed-branch";
const KEY_FEED_FORK: &str = "org.dxos.key.feed-fork";
const KEY_FEED_PREV: &str = "org.dxos.key.feed-prev";
const KEY_FEED_FORK_AT: &str = "org.dxos.key.feed-fork-at";

/// The namespace a Feed object names when it names none.
const DEFAULT_NAMESPACE: &str = "data";

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

/// Whether a stored type URI names the Feed type, at any version.
pub(super) fn is_type(type_dxn: &str, feed_typename: &str) -> bool {
    type_dxn
        .strip_prefix("dxn:")
        .and_then(|rest| rest.strip_prefix(feed_typename))
        .is_some_and(|rest| rest.is_empty() || rest.starts_with(':'))
}

/// A feed's indexing and retention options, as a Feed object holds them; an invalid part is dropped,
/// as index-core drops it.
#[derive(Clone, PartialEq)]
pub(super) struct FeedOptions {
    indexing: Option<JsonMap<String, Json>>,
    max_length: Option<i64>,
    max_age: Option<f64>,
    has_retention: bool,
}

impl FeedOptions {
    /// The namespace and options a Feed object's JSON names.
    pub(super) fn of(json: &Json) -> (String, FeedOptions) {
        let namespace = match json.get("namespace").and_then(Json::as_str) {
            Some(namespace @ ("data" | "trace")) => namespace.to_owned(),
            _ => DEFAULT_NAMESPACE.to_owned(),
        };
        let indexing = json.get("indexing").and_then(|value| {
            let map = value.as_object()?;
            let enabled = map.get("enabled")?.as_bool()?;
            let mode = match map.get("mode") {
                None => None,
                Some(Json::String(mode)) if mode == "all" || mode == "main" => Some(mode.clone()),
                Some(_) => return None,
            };
            let mut out = JsonMap::new();
            out.insert("enabled".into(), Json::Bool(enabled));
            if let Some(mode) = mode {
                out.insert("mode".into(), Json::String(mode));
            }
            Some(out)
        });
        let retention = json.get("retention").and_then(|value| {
            let map = value.as_object()?;
            let max_length = match map.get("maxLength") {
                None => None,
                Some(value) => {
                    let number = value.as_f64()?;
                    if number.fract() != 0.0 || number < 1.0 {
                        return None;
                    }
                    Some(number as i64)
                }
            };
            let max_age = match map.get("maxAge") {
                None => None,
                Some(value) => {
                    let number = value.as_f64()?;
                    if !number.is_finite() || number <= 0.0 {
                        return None;
                    }
                    Some(number)
                }
            };
            Some((max_length, max_age))
        });
        (
            namespace,
            FeedOptions {
                indexing,
                max_length: retention.and_then(|(length, _)| length),
                max_age: retention.and_then(|(_, age)| age),
                has_retention: retention.is_some(),
            },
        )
    }

    /// The canonical JSON `feeds.options` holds, in the key order of `Feed.FeedOptions`.
    fn to_text(&self) -> String {
        let mut out = JsonMap::new();
        if let Some(indexing) = &self.indexing {
            out.insert("indexing".into(), Json::Object(indexing.clone()));
        }
        if self.has_retention {
            let mut retention = JsonMap::new();
            if let Some(length) = self.max_length {
                retention.insert("maxLength".into(), Json::from(length));
            }
            if let Some(age) = self.max_age {
                retention.insert(
                    "maxAge".into(),
                    serde_json::Number::from_f64(age)
                        .map(Json::Number)
                        .unwrap_or(Json::Null),
                );
            }
            out.insert("retention".into(), Json::Object(retention));
        }
        Json::Object(out).to_string()
    }

    fn parse(text: &str) -> Option<FeedOptions> {
        serde_json::from_str::<Json>(text)
            .ok()
            .map(|json| FeedOptions::of(&json).1)
    }
}

/// One item block: where it lives, and its JSON parsed before its payload moves into storage.
pub(super) struct ItemBlock {
    feed_id: String,
    namespace: String,
    actor_id: String,
    sequence: i64,
    prev: Option<(String, i64)>,
    position: Option<i64>,
    timestamp: i64,
    json: Option<Json>,
    insertion_id: i64,
}

impl ItemBlock {
    pub(super) fn of(block: &BlockRow, namespace: &str) -> ItemBlock {
        ItemBlock {
            feed_id: block.feed_id.clone(),
            namespace: namespace.to_owned(),
            actor_id: block.actor_id.clone(),
            sequence: block.sequence,
            prev: block.prev_actor_id.clone().zip(block.prev_sequence),
            position: block.position,
            timestamp: block.timestamp,
            json: serde_json::from_slice::<Json>(&block.data)
                .ok()
                .filter(|json| json.get("id").is_some_and(Json::is_string)),
            insertion_id: 0,
        }
    }

    /// The item as a store reads it back (`EchoFeedCodec.decodeBlock` on the main branch): its
    /// position, block id and predecessor stamped as meta keys.
    fn decoded(&self) -> Option<Json> {
        let mut json = self.json.clone()?;
        if let Some(position) = self.position {
            set_key(&mut json, KEY_QUEUE_POSITION, &position.to_string());
        }
        set_key(
            &mut json,
            KEY_FEED_BLOCK,
            &format!("{}@{}", self.sequence, self.actor_id),
        );
        remove_keys(
            &mut json,
            &[
                KEY_FEED_BRANCH,
                KEY_FEED_FORK,
                KEY_FEED_PREV,
                KEY_FEED_FORK_AT,
            ],
        );
        if let Some((actor, sequence)) = &self.prev {
            set_key(&mut json, KEY_FEED_PREV, &format!("{sequence}@{actor}"));
        }
        Some(json)
    }
}

fn meta_keys(json: &Json) -> Vec<Json> {
    json.get("@meta")
        .and_then(|meta| meta.get("keys"))
        .and_then(Json::as_array)
        .cloned()
        .unwrap_or_default()
}

fn set_meta_keys(json: &mut Json, keys: Vec<Json>) {
    let Some(object) = json.as_object_mut() else {
        return;
    };
    let meta = object
        .entry("@meta")
        .or_insert_with(|| Json::Object(JsonMap::new()));
    if !meta.is_object() {
        *meta = Json::Object(JsonMap::new());
    }
    if let Some(meta) = meta.as_object_mut() {
        meta.insert("keys".into(), Json::Array(keys));
    }
}

fn source_of(key: &Json) -> Option<&str> {
    key.get("source").and_then(Json::as_str)
}

fn set_key(json: &mut Json, source: &str, id: &str) {
    let mut keys: Vec<Json> = meta_keys(json)
        .into_iter()
        .filter(|key| source_of(key) != Some(source))
        .collect();
    let mut key = JsonMap::new();
    key.insert("source".into(), Json::String(source.to_owned()));
    key.insert("id".into(), Json::String(id.to_owned()));
    keys.push(Json::Object(key));
    set_meta_keys(json, keys);
}

fn remove_keys(json: &mut Json, sources: &[&str]) {
    if json.get("@meta").is_none_or(|meta| !meta.is_object()) {
        return;
    }
    let keys = meta_keys(json)
        .into_iter()
        .filter(|key| !source_of(key).is_some_and(|source| sources.contains(&source)))
        .collect();
    set_meta_keys(json, keys);
}

/// The columns of an item row a partial block (a tombstone) keeps from the row before it.
struct PriorRow {
    record_id: i64,
    insertion_id: Option<i64>,
    kind: String,
    type_dxn: String,
    source: Option<String>,
    target: Option<String>,
    parent: Option<String>,
    parent_id: Option<String>,
    source_id: Option<String>,
    target_id: Option<String>,
    convergence_key: Option<String>,
    annotations: Option<String>,
}

impl Engine {
    /// Appends items to their feeds, one whole-item block each, and indexes them; items of a feed with
    /// retention options trim it. `items` are `(feedId, namespace, item JSON)` in append order.
    pub(super) fn append_items(
        &mut self,
        items: Vec<(String, String, Vec<u8>)>,
        now: i64,
    ) -> SqlResult<()> {
        let mut by_namespace: HashMap<String, (Vec<BlockRow>, Vec<ItemBlock>)> = HashMap::new();
        for (feed_id, namespace, data) in items {
            let previous = self.item_feed_head(&feed_id)?;
            let sequence = previous.as_ref().map(|(seq, _)| seq + 1).unwrap_or(0);
            self.heads
                .insert(feed_id.clone(), (sequence, self.actor_id.clone()));
            let position = self.next_position(&namespace)?;
            let block = BlockRow {
                feed_id,
                actor_id: self.actor_id.clone(),
                sequence,
                prev_actor_id: previous.as_ref().map(|(_, actor)| actor.clone()),
                prev_sequence: previous.map(|(seq, _)| seq),
                position,
                timestamp: now,
                data,
            };
            let item = ItemBlock::of(&block, &namespace);
            let entry = by_namespace.entry(namespace).or_default();
            entry.0.push(block);
            entry.1.push(item);
        }
        for (namespace, (blocks, items)) in by_namespace {
            let inserted = self.insert_blocks(&namespace, blocks, false)?;
            self.index_item_blocks(items, &inserted, now)?;
        }
        Ok(())
    }

    /// Indexes pulled item blocks, keeping the feed heads of feeds this engine appends to in step.
    pub(super) fn index_pulled_items(
        &mut self,
        items: Vec<ItemBlock>,
        inserted: &HashMap<(String, String, i64), i64>,
    ) -> SqlResult<Vec<String>> {
        for item in &items {
            if let Some((sequence, actor)) = self.heads.get(&item.feed_id) {
                if (item.sequence, item.actor_id.as_str()) > (*sequence, actor.as_str()) {
                    self.heads
                        .insert(item.feed_id.clone(), (item.sequence, item.actor_id.clone()));
                }
            }
        }
        self.index_item_blocks(items, inserted, now_ms())
    }

    fn index_item_blocks(
        &mut self,
        mut items: Vec<ItemBlock>,
        inserted: &HashMap<(String, String, i64), i64>,
        now: i64,
    ) -> SqlResult<Vec<String>> {
        let mut feeds: Vec<(String, String)> = Vec::new();
        for item in &mut items {
            item.insertion_id = inserted
                .get(&(item.feed_id.clone(), item.actor_id.clone(), item.sequence))
                .copied()
                .unwrap_or(0);
            if !feeds.iter().any(|(feed, _)| *feed == item.feed_id) {
                feeds.push((item.feed_id.clone(), item.namespace.clone()));
            }
        }
        let mut indexed = Vec::new();
        for item in &items {
            if item.insertion_id > 0 {
                if let Some(id) = self.index_item(item)? {
                    indexed.push(id);
                }
            }
        }
        for (feed_id, namespace) in feeds {
            self.trim_feed(&feed_id, &namespace, now)?;
        }
        Ok(indexed)
    }

    /// The newest block of an item feed, read from storage the first time this engine appends to it.
    fn item_feed_head(&mut self, feed_id: &str) -> SqlResult<Option<(i64, String)>> {
        if let Some(head) = self.heads.get(feed_id) {
            return Ok(Some(head.clone()));
        }
        let mut head = None;
        self.db.query(
            "SELECT sequence, actorId FROM blocks WHERE spaceId = ? AND feedId = ? ORDER BY sequence DESC, actorId DESC LIMIT 1",
            &[Param::Text(self.space_id.clone()), Param::Text(feed_id.to_owned())],
            |row| {
                head = Some((
                    row[0].int().unwrap_or(0),
                    row[1].text().unwrap_or_default().to_owned(),
                ));
                Ok(())
            },
        )?;
        Ok(head)
    }

    fn prior_row(&mut self, feed_id: &str, object_id: &str) -> SqlResult<Option<PriorRow>> {
        let mut prior = None;
        self.db.query(
            "SELECT recordId, queueInsertionId, entityKind, typeDXN, source, target, parent, parentId, sourceId, targetId, convergenceKey, annotations FROM objectMeta WHERE spaceId = ? AND queueId = ? AND objectId = ? LIMIT 1",
            &[
                Param::Text(self.space_id.clone()),
                Param::Text(feed_id.to_owned()),
                Param::Text(object_id.to_owned()),
            ],
            |row| {
                let text = |index: usize| row[index].text().map(str::to_owned);
                prior = Some(PriorRow {
                    record_id: row[0].int().unwrap_or(0),
                    insertion_id: row[1].int(),
                    kind: text(2).unwrap_or_default(),
                    type_dxn: text(3).unwrap_or_default(),
                    source: text(4),
                    target: text(5),
                    parent: text(6),
                    parent_id: text(7),
                    source_id: text(8),
                    target_id: text(9),
                    convergence_key: text(10),
                    annotations: text(11),
                });
                Ok(())
            },
        )?;
        Ok(prior)
    }

    /// Indexes one item block into its row, unless the row already shows a later block of the item.
    /// A partial block (a tombstone, which has no `@type`) keeps the row's body and type.
    fn index_item(&mut self, item: &ItemBlock) -> SqlResult<Option<String>> {
        let Some(data) = item.decoded() else {
            return Ok(None);
        };
        let object_id = data
            .get("id")
            .and_then(Json::as_str)
            .unwrap_or_default()
            .to_owned();
        let prior = self.prior_row(&item.feed_id, &object_id)?;
        if prior
            .as_ref()
            .and_then(|prior| prior.insertion_id)
            .is_some_and(|insertion| insertion > item.insertion_id)
        {
            return Ok(None);
        }
        let space_id = self.space_id.clone();
        let text = |key: &str| data.get(key).and_then(Json::as_str).map(str::to_owned);
        let partial = data.get("@type").is_none();
        let preserved = prior.as_ref().filter(|_| partial);
        let source = match preserved {
            Some(prior) => prior.source.clone(),
            None => text("@relationSource"),
        };
        let kind = match preserved {
            Some(prior) => prior.kind.clone(),
            None if source.is_some() => "relation".to_owned(),
            None => "object".to_owned(),
        };
        let target = match preserved {
            Some(prior) => prior.target.clone(),
            None if kind == "relation" => text("@relationTarget"),
            None => None,
        };
        let parent = match preserved {
            Some(prior) => prior.parent.clone(),
            None => text("@parent"),
        };
        let (parent_id, source_id, target_id) = match preserved {
            Some(prior) => (
                prior.parent_id.clone(),
                prior.source_id.clone(),
                prior.target_id.clone(),
            ),
            None => (
                doc::local_entity_id(parent.as_deref(), &space_id),
                doc::local_entity_id(source.as_deref(), &space_id),
                doc::local_entity_id(target.as_deref(), &space_id),
            ),
        };
        let meta = data.get("@meta");
        let convergence_key = match preserved {
            Some(prior) => prior.convergence_key.clone(),
            None => meta
                .and_then(|meta| meta.get("convergenceKey"))
                .and_then(Json::as_str)
                .map(str::to_owned),
        };
        let annotations = match preserved {
            Some(prior) => prior.annotations.clone(),
            None => meta
                .and_then(|meta| meta.get("annotations"))
                .filter(|value| value.as_object().is_some_and(|map| !map.is_empty()))
                .map(Json::to_string),
        };
        let type_dxn = match preserved {
            Some(prior) => prior.type_dxn.clone(),
            None => doc::normalize_type_uri(&text("@type").unwrap_or_else(|| "type".to_owned())),
        };
        let deleted = i64::from(
            data.get("@deleted")
                .and_then(Json::as_bool)
                .unwrap_or(false),
        );

        // A partial block layers onto the prior snapshot, so the row keeps the body a client hydrates.
        let snapshot = match preserved {
            Some(prior) => {
                let mut merged = Json::Object(JsonMap::new());
                self.db.query(
                    "SELECT snapshot FROM objectSnapshot WHERE recordId = ?",
                    &[Param::Int(prior.record_id)],
                    |row| {
                        if let Some(text) = row[0].text() {
                            merged = serde_json::from_str(text).unwrap_or(Json::Null);
                        }
                        Ok(())
                    },
                )?;
                if let (Some(merged), Some(fields)) = (merged.as_object_mut(), data.as_object()) {
                    for (key, value) in fields {
                        merged.insert(key.clone(), value.clone());
                    }
                }
                merged
            }
            None => data.clone(),
        };
        let refs = doc::extract_references(&snapshot, true);

        let (record_id, version) = {
            let mut file = self.file.borrow_mut();
            let record_id = match &prior {
                Some(prior) => prior.record_id,
                None => {
                    let id = file.next_record_id;
                    file.next_record_id += 1;
                    id
                }
            };
            let version = file.next_version;
            file.next_version += 1;
            (record_id, version)
        };
        self.db.execute_owned(
            "INSERT INTO objectMeta (recordId, objectId, queueId, queueNamespace, spaceId, documentId, entityKind, typeDXN, deleted, source, target, parent, parentId, sourceId, targetId, convergenceKey, annotations, version, createdAt, updatedAt, queuePosition, queueInsertionId, queueBranch) \
             VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL) \
             ON CONFLICT (recordId) DO UPDATE SET queueNamespace = excluded.queueNamespace, entityKind = excluded.entityKind, typeDXN = excluded.typeDXN, deleted = excluded.deleted, source = excluded.source, target = excluded.target, parent = excluded.parent, parentId = excluded.parentId, sourceId = excluded.sourceId, targetId = excluded.targetId, convergenceKey = excluded.convergenceKey, annotations = excluded.annotations, version = excluded.version, updatedAt = excluded.updatedAt, queuePosition = excluded.queuePosition, queueInsertionId = excluded.queueInsertionId, queueBranch = excluded.queueBranch",
            vec![
                Param::Int(record_id),
                Param::Text(object_id.clone()),
                Param::Text(item.feed_id.clone()),
                Param::Text(item.namespace.clone()),
                Param::Text(space_id),
                Param::Text(kind),
                Param::Text(type_dxn),
                Param::Int(deleted),
                Param::from(source),
                Param::from(target),
                Param::from(parent),
                Param::from(parent_id),
                Param::from(source_id),
                Param::from(target_id),
                Param::from(convergence_key),
                Param::from(annotations),
                Param::Int(version),
                Param::Int(item.timestamp),
                Param::Int(item.timestamp),
                Param::from(item.position),
                Param::Int(item.insertion_id),
            ],
        )?;
        self.db.execute_owned(
            "INSERT INTO objectSnapshot (recordId, snapshot) VALUES (?, ?) ON CONFLICT (recordId) DO UPDATE SET snapshot = excluded.snapshot, version = NULL, heads = NULL",
            vec![Param::Int(record_id), Param::Text(snapshot.to_string())],
        )?;
        if prior.is_some() {
            self.db.execute(
                "DELETE FROM reverseRef WHERE recordId = ?",
                &[Param::Int(record_id)],
            )?;
        }
        let mut seen = std::collections::HashSet::new();
        let refs: Vec<_> = refs
            .into_iter()
            .filter(|(target, path, _)| seen.insert((target.clone(), path.clone())))
            .collect();
        // Chunked, so an item with many references stays under the bound-parameter cap.
        for chunk in refs.chunks(super::ROWS_PER_STATEMENT) {
            let sql = format!(
                "INSERT INTO reverseRef (recordId, targetDXN, propPath, propPathNormalized) VALUES {}",
                placeholders(chunk.len(), 4)
            );
            let mut params = Vec::with_capacity(chunk.len() * 4);
            for (target, path, normalized) in chunk {
                params.extend([
                    Param::Int(record_id),
                    Param::Text(target.clone()),
                    Param::Text(path.clone()),
                    Param::Text(normalized.clone()),
                ]);
            }
            self.db.execute_owned(&sql, params)?;
        }
        Ok(Some(object_id))
    }

    /// A feed's stored options, read once per engine.
    fn options_of(&mut self, feed_id: &str) -> SqlResult<Option<FeedOptions>> {
        if let Some(options) = self.feed_options.get(feed_id) {
            return Ok(options.clone());
        }
        let mut options = None;
        self.db.query(
            "SELECT options FROM feeds WHERE spaceId = ? AND feedId = ?",
            &[
                Param::Text(self.space_id.clone()),
                Param::Text(feed_id.to_owned()),
            ],
            |row| {
                options = row[0].text().and_then(FeedOptions::parse);
                Ok(())
            },
        )?;
        self.feed_options
            .insert(feed_id.to_owned(), options.clone());
        Ok(options)
    }

    /// Stores the options a Feed object holds on its feed, and trims the feed by them when they changed.
    pub(super) fn apply_feed_options(
        &mut self,
        feed_id: &str,
        namespace: &str,
        options: FeedOptions,
    ) -> SqlResult<()> {
        if self.options_of(feed_id)?.as_ref() == Some(&options) {
            return Ok(());
        }
        self.db.execute_owned(
            "INSERT INTO feeds (spaceId, feedId, namespace, options) VALUES (?, ?, ?, ?) ON CONFLICT (spaceId, feedId) DO UPDATE SET namespace = excluded.namespace, options = excluded.options",
            vec![
                Param::Text(self.space_id.clone()),
                Param::Text(feed_id.to_owned()),
                Param::Text(namespace.to_owned()),
                Param::Text(options.to_text()),
            ],
        )?;
        self.feed_options.insert(feed_id.to_owned(), Some(options));
        self.trim_feed(feed_id, namespace, now_ms())
    }

    /// Deletes the blocks of a feed that break its retention at `now`, with the rows they back. A
    /// replica keeps blocks it has not pushed; a file that positions its own blocks keeps the one
    /// holding the namespace's highest position, which it would otherwise issue again.
    fn trim_feed(&mut self, feed_id: &str, namespace: &str, now: i64) -> SqlResult<()> {
        let Some(options) = self.options_of(feed_id)? else {
            return Ok(());
        };
        let space = Param::Text(self.space_id.clone());
        let feed = Param::Text(feed_id.to_owned());
        let mut breaks: Vec<String> = Vec::new();
        let mut params: Vec<Param> = vec![space.clone(), feed.clone()];
        if let Some(max_length) = options.max_length {
            let mut count = 0;
            self.db.query(
                "SELECT COUNT(*) FROM blocks WHERE spaceId = ? AND feedId = ?",
                &[space.clone(), feed.clone()],
                |row| {
                    count = row[0].int().unwrap_or(0);
                    Ok(())
                },
            )?;
            if count > max_length {
                let mut threshold = None;
                self.db.query(
                    "SELECT insertionId FROM blocks WHERE spaceId = ? AND feedId = ? ORDER BY insertionId ASC LIMIT 1 OFFSET ?",
                    &[space.clone(), feed.clone(), Param::Int(count - max_length - 1)],
                    |row| {
                        threshold = row[0].int();
                        Ok(())
                    },
                )?;
                if let Some(threshold) = threshold {
                    breaks.push("insertionId <= ?".into());
                    params.push(Param::Int(threshold));
                }
            }
        }
        if let Some(max_age) = options.max_age {
            breaks.push("timestamp < ?".into());
            params.push(Param::Int(now - max_age as i64));
        }
        if breaks.is_empty() {
            return Ok(());
        }
        let mut sql = format!(
            "DELETE FROM blocks WHERE spaceId = ? AND feedId = ? AND ({})",
            breaks.join(" OR ")
        );
        if self.assign_positions {
            let mut max = None;
            self.db.query(
                "SELECT MAX(position) FROM blocks WHERE spaceId = ? AND namespace = ?",
                &[space.clone(), Param::Text(namespace.to_owned())],
                |row| {
                    max = row[0].int();
                    Ok(())
                },
            )?;
            if let Some(max) = max {
                sql.push_str(" AND (position IS NULL OR position < ?)");
                params.push(Param::Int(max));
            }
        } else {
            sql.push_str(" AND position IS NOT NULL");
        }
        sql.push_str(" RETURNING insertionId");
        let mut trimmed = Vec::new();
        self.db.query_owned(&sql, params, |row| {
            trimmed.push(row[0].int().unwrap_or(0));
            Ok(())
        })?;
        for insertion in trimmed {
            let mut record = None;
            self.db.query(
                "SELECT recordId FROM objectMeta WHERE spaceId = ? AND queueId = ? AND queueInsertionId = ?",
                &[space.clone(), feed.clone(), Param::Int(insertion)],
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
        }
        Ok(())
    }
}
