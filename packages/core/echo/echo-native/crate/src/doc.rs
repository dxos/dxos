//! Objects' Automerge documents: writing an ECHO structure with the smallest edit (as echo-sqlite's
//! `apply.ts` does, so concurrent edits merge), and reading an object back as ECHO JSON.

use automerge::{
    transaction::Transactable, AutoCommit, ChangeHash, ObjId, ObjType, Prop, ReadDoc, ScalarValue,
    Value as AmValue, ROOT,
};
use base64::Engine as _;
use serde_json::{Map as JsonMap, Value as Json};

use crate::wire::Value;

pub type DocResult<T> = Result<T, String>;

fn err(error: automerge::AutomergeError) -> String {
    error.to_string()
}

/// Gets or creates the map at `key` of `parent`.
fn ensure_map(doc: &mut AutoCommit, parent: &ObjId, key: &str) -> DocResult<ObjId> {
    if let Some((AmValue::Object(ObjType::Map), id)) = doc.get(parent, key).map_err(err)? {
        return Ok(id);
    }
    doc.put_object(parent, key, ObjType::Map).map_err(err)
}

/// Writes one object's structure into its document as one change, made at `heads` when the document
/// has moved past them so concurrent changes merge with it. Returns whether the edit was made behind.
pub fn write_object(
    doc: &mut AutoCommit,
    is_new: bool,
    space_id: &str,
    object_id: &str,
    structure: &Value,
    heads: Option<&[ChangeHash]>,
    now_ms: f64,
) -> DocResult<bool> {
    let current = doc.get_heads();
    let behind = match heads {
        Some(heads) if !heads.is_empty() => !same_heads(heads, &current),
        _ => false,
    };
    if behind {
        doc.isolate(heads.unwrap_or(&[]));
    }
    if is_new {
        // A new document's header goes in the object's first change: one change per new object.
        doc.put(ROOT, "version", ScalarValue::Int(1)).map_err(err)?;
        let access = doc.put_object(ROOT, "access", ObjType::Map).map_err(err)?;
        put_text(doc, &access, Prop::Map("spaceId".into()), space_id)?;
    }
    let objects = ensure_map(doc, &ROOT, "objects")?;
    // `createdAt` is set once, by the first writer, and survives every later write.
    let existing_created = match doc.get(&objects, object_id).map_err(err)? {
        Some((AmValue::Object(_), object)) => match doc.get(&object, "system").map_err(err)? {
            Some((AmValue::Object(_), system)) => match doc.get(&system, "createdAt").map_err(err)? {
                Some((AmValue::Scalar(value), _)) => scalar_number(&value),
                _ => None,
            },
            _ => None,
        },
        _ => None,
    };
    let structure_created = structure.get("system").and_then(|system| match system.get("createdAt") {
        Some(Value::Int(value)) => Some(*value as f64),
        Some(Value::Float(value)) => Some(*value),
        _ => None,
    });
    let created = existing_created.or(structure_created).unwrap_or(now_ms);
    let next = with_created(structure, created);
    apply_value(doc, &objects, Prop::Map(object_id.into()), &next, false)?;
    doc.commit_with(automerge::transaction::CommitOptions::default().with_time((now_ms / 1000.0) as i64));
    if behind {
        doc.integrate();
    }
    Ok(behind)
}

/// Marks an object deleted, as its structure with `system.deleted` would.
fn with_created(structure: &Value, created: f64) -> Value {
    let created = Value::Int(created as i64);
    match structure {
        Value::Map(entries) => {
            let mut entries = entries.clone();
            match entries.iter_mut().find(|(key, _)| key == "system") {
                Some((_, Value::Map(system))) => match system.iter_mut().find(|(key, _)| key == "createdAt") {
                    Some((_, value)) => *value = created,
                    None => system.push(("createdAt".into(), created)),
                },
                _ => entries.push(("system".into(), Value::Map(vec![("createdAt".into(), created)]))),
            }
            Value::Map(entries)
        }
        other => other.clone(),
    }
}

fn scalar_number(value: &ScalarValue) -> Option<f64> {
    match value {
        ScalarValue::Int(value) | ScalarValue::Timestamp(value) => Some(*value as f64),
        ScalarValue::Uint(value) => Some(*value as f64),
        ScalarValue::F64(value) => Some(*value),
        _ => None,
    }
}

pub fn same_heads(left: &[ChangeHash], right: &[ChangeHash]) -> bool {
    left.len() == right.len() && left.iter().all(|head| right.contains(head))
}

fn put_text(doc: &mut AutoCommit, parent: &ObjId, prop: Prop, text: &str) -> DocResult<()> {
    let id = match prop {
        Prop::Map(key) => doc.put_object(parent, key, ObjType::Text).map_err(err)?,
        Prop::Seq(index) => doc.insert_object(parent, index, ObjType::Text).map_err(err)?,
    };
    if !text.is_empty() {
        doc.splice_text(&id, 0, 0, text).map_err(err)?;
    }
    Ok(())
}

fn to_scalar(value: &Value) -> Option<ScalarValue> {
    Some(match value {
        Value::Null => ScalarValue::Null,
        Value::Bool(value) => ScalarValue::Boolean(*value),
        Value::Int(value) => ScalarValue::Int(*value),
        Value::Float(value) => ScalarValue::F64(*value),
        Value::Bytes(value) => ScalarValue::Bytes(value.clone()),
        _ => return None,
    })
}

/// Inserts or replaces `parent[prop]` with a fresh copy of `value`.
fn put_new(doc: &mut AutoCommit, parent: &ObjId, prop: Prop, value: &Value, insert: bool) -> DocResult<()> {
    match value {
        Value::Str(text) => {
            let prop = prop;
            let id = match (&prop, insert) {
                (Prop::Seq(index), true) => doc.insert_object(parent, *index, ObjType::Text).map_err(err)?,
                (Prop::Seq(index), false) => doc.put_object(parent, *index, ObjType::Text).map_err(err)?,
                (Prop::Map(key), _) => doc.put_object(parent, key.as_str(), ObjType::Text).map_err(err)?,
            };
            if !text.is_empty() {
                doc.splice_text(&id, 0, 0, text).map_err(err)?;
            }
        }
        Value::Map(entries) => {
            let id = make_object(doc, parent, &prop, ObjType::Map, insert)?;
            for (key, inner) in entries {
                put_new(doc, &id, Prop::Map(key.clone()), inner, false)?;
            }
        }
        Value::Array(items) => {
            let id = make_object(doc, parent, &prop, ObjType::List, insert)?;
            for (index, inner) in items.iter().enumerate() {
                put_new(doc, &id, Prop::Seq(index), inner, true)?;
            }
        }
        scalar => {
            let scalar = to_scalar(scalar).expect("composite values are handled above");
            match (prop, insert) {
                (Prop::Seq(index), true) => doc.insert(parent, index, scalar).map_err(err)?,
                (prop, _) => doc.put(parent, prop, scalar).map_err(err)?,
            }
        }
    }
    Ok(())
}

fn make_object(doc: &mut AutoCommit, parent: &ObjId, prop: &Prop, kind: ObjType, insert: bool) -> DocResult<ObjId> {
    match (prop, insert) {
        (Prop::Seq(index), true) => doc.insert_object(parent, *index, kind).map_err(err),
        (Prop::Seq(index), false) => doc.put_object(parent, *index, kind).map_err(err),
        (Prop::Map(key), _) => doc.put_object(parent, key.as_str(), kind).map_err(err),
    }
}

fn same_scalar(current: &ScalarValue, value: &Value) -> bool {
    match (current, value) {
        (ScalarValue::Null, Value::Null) => true,
        (ScalarValue::Boolean(left), Value::Bool(right)) => left == right,
        (ScalarValue::Bytes(left), Value::Bytes(right)) => left == right,
        (ScalarValue::Str(left), Value::Str(right)) => left.as_str() == right,
        (current, Value::Int(right)) => scalar_number(current) == Some(*right as f64),
        (current, Value::Float(right)) => scalar_number(current) == Some(*right),
        _ => false,
    }
}

fn prop_has_slash(prop: &Prop) -> bool {
    matches!(prop, Prop::Map(key) if key.contains('/'))
}

/// Sets `parent[prop]` to `value` with the smallest edit: maps and arrays member by member, and a
/// string as a text edit, unless the path holds a `/` key (a reference), where it is assigned whole.
pub fn apply_value(doc: &mut AutoCommit, parent: &ObjId, prop: Prop, value: &Value, slashed: bool) -> DocResult<()> {
    let slashed = slashed || prop_has_slash(&prop);
    let current = doc.get(parent, prop.clone()).map_err(err)?;
    match (current, value) {
        (Some((AmValue::Object(ObjType::Text), id)), Value::Str(text)) if !slashed => {
            if doc.text(&id).map_err(err)? != *text {
                doc.update_text(&id, text).map_err(err)?;
            }
        }
        (Some((AmValue::Object(ObjType::Map | ObjType::Table), id)), Value::Map(entries)) => {
            let existing: Vec<String> = doc.keys(&id).collect();
            for key in existing {
                if !entries.iter().any(|(name, _)| *name == key) {
                    doc.delete(&id, key.as_str()).map_err(err)?;
                }
            }
            for (key, inner) in entries {
                apply_value(doc, &id, Prop::Map(key.clone()), inner, slashed)?;
            }
        }
        (Some((AmValue::Object(ObjType::List), id)), Value::Array(items)) => {
            let length = doc.length(&id);
            let common = length.min(items.len());
            for (index, inner) in items.iter().enumerate().take(common) {
                apply_value(doc, &id, Prop::Seq(index), inner, slashed)?;
            }
            for index in (items.len()..length).rev() {
                doc.delete(&id, index).map_err(err)?;
            }
            for (index, inner) in items.iter().enumerate().skip(common) {
                put_new(doc, &id, Prop::Seq(index), inner, true)?;
            }
        }
        (Some((AmValue::Scalar(current), _)), value) if same_scalar(&current, value) => {}
        (Some((AmValue::Object(ObjType::Text), id)), Value::Str(text)) => {
            // A slashed path assigns the string whole, but an equal one is no change.
            if doc.text(&id).map_err(err)? != *text {
                put_new(doc, parent, prop, value, false)?;
            }
        }
        _ => put_new(doc, parent, prop, value, false)?,
    }
    Ok(())
}

/// Reads a document value as plain JSON, with bytes in the DAG-JSON form ECHO's JSON uses.
pub fn read_json(doc: &AutoCommit, value: AmValue<'_>, id: &ObjId) -> DocResult<Json> {
    Ok(match value {
        AmValue::Object(ObjType::Text) => Json::String(doc.text(id).map_err(err)?),
        AmValue::Object(ObjType::Map | ObjType::Table) => {
            let mut map = JsonMap::new();
            for key in doc.keys(id) {
                if let Some((inner, inner_id)) = doc.get(id, key.as_str()).map_err(err)? {
                    map.insert(key, read_json(doc, inner, &inner_id)?);
                }
            }
            Json::Object(map)
        }
        AmValue::Object(ObjType::List) => {
            let length = doc.length(id);
            let mut items = Vec::with_capacity(length);
            for index in 0..length {
                match doc.get(id, index).map_err(err)? {
                    Some((inner, inner_id)) => items.push(read_json(doc, inner, &inner_id)?),
                    None => items.push(Json::Null),
                }
            }
            Json::Array(items)
        }
        AmValue::Scalar(scalar) => match scalar.as_ref() {
            ScalarValue::Null | ScalarValue::Unknown { .. } => Json::Null,
            ScalarValue::Boolean(value) => Json::Bool(*value),
            ScalarValue::Int(value) | ScalarValue::Timestamp(value) => Json::from(*value),
            ScalarValue::Uint(value) => Json::from(*value),
            ScalarValue::Counter(counter) => Json::from(i64::from(counter)),
            ScalarValue::F64(value) => float_json(*value),
            ScalarValue::Str(text) => Json::String(text.to_string()),
            ScalarValue::Bytes(bytes) => {
                let encoded = base64::engine::general_purpose::STANDARD_NO_PAD.encode(bytes);
                let mut inner = JsonMap::new();
                inner.insert("bytes".into(), Json::String(encoded));
                let mut outer = JsonMap::new();
                outer.insert("/".into(), Json::Object(inner));
                Json::Object(outer)
            }
        },
    })
}

/// An integral float is written as an integer, as `JSON.stringify` writes every JS number.
fn float_json(value: f64) -> Json {
    if value.fract() == 0.0 && value.abs() < 9.007_199_254_740_992e15 {
        Json::from(value as i64)
    } else {
        serde_json::Number::from_f64(value).map(Json::Number).unwrap_or(Json::Null)
    }
}

/// The stored structure of `object_id` (`{ system, meta, data }`), if the document holds it.
pub fn read_structure(doc: &AutoCommit, object_id: &str) -> DocResult<Option<Json>> {
    let objects = match doc.get(ROOT, "objects").map_err(err)? {
        Some((AmValue::Object(_), id)) => id,
        _ => return Ok(None),
    };
    match doc.get(&objects, object_id).map_err(err)? {
        Some((value @ AmValue::Object(_), id)) => Ok(Some(read_json(doc, value, &id)?)),
        _ => Ok(None),
    }
}

/// The object ids a document holds (one for an ECHO document, more after a merge).
pub fn object_ids(doc: &AutoCommit) -> DocResult<Vec<String>> {
    match doc.get(ROOT, "objects").map_err(err)? {
        Some((AmValue::Object(_), id)) => Ok(doc.keys(&id).collect()),
        _ => Ok(Vec::new()),
    }
}

/// Meta fields that are neither containers nor derived on read: a meta holding one is not empty.
const SCALAR_META_FIELDS: &[&str] = &["key", "version", "convergenceKey"];

/// ECHO's JSON for a stored structure, as `objectStructureToJson` builds it.
pub fn structure_to_json(object_id: &str, structure: &Json) -> Json {
    let mut out = JsonMap::new();
    if let Some(Json::Object(data)) = structure.get("data") {
        for (key, value) in data {
            out.insert(key.clone(), value.clone());
        }
    }
    out.insert("id".into(), Json::String(object_id.into()));
    let system = structure.get("system");
    let reference = |name: &str| -> Option<Json> {
        system
            .and_then(|system| system.get(name))
            .and_then(|reference| reference.get("/"))
            .and_then(|uri| uri.as_str())
            .map(|uri| Json::String(uri.to_owned()))
    };
    if let Some(meta @ Json::Object(fields)) = structure.get("meta") {
        let non_empty = |name: &str| match fields.get(name) {
            Some(Json::Array(items)) => !items.is_empty(),
            Some(Json::Object(entries)) => !entries.is_empty(),
            _ => false,
        };
        if non_empty("keys")
            || non_empty("tags")
            || non_empty("annotations")
            || SCALAR_META_FIELDS.iter().any(|field| fields.get(*field).is_some_and(|value| !value.is_null()))
        {
            out.insert("@meta".into(), meta.clone());
        }
    }
    if let Some(uri) = reference("type") {
        out.insert("@type".into(), uri);
    }
    let deleted = system.and_then(|system| system.get("deleted")).and_then(|value| value.as_bool()).unwrap_or(false);
    out.insert("@deleted".into(), Json::Bool(deleted));
    for (name, attr) in [("parent", "@parent"), ("source", "@relationSource"), ("target", "@relationTarget")] {
        if let Some(Json::String(uri)) = reference(name) {
            if parse_eid(&uri).is_some() {
                out.insert(attr.into(), Json::String(normalize_eid(&uri)));
            }
        }
    }
    Json::Object(out)
}

/// `(spaceId, entityId)` of an `echo:` URI, as `EID.tryParse` accepts it.
pub fn parse_eid(uri: &str) -> Option<(Option<&str>, Option<&str>)> {
    let rest = uri.strip_prefix("echo:")?;
    if let Some(local) = rest.strip_prefix("///") {
        return (!local.is_empty() && !local.contains('/')).then_some((None, Some(local)));
    }
    if let Some(qualified) = rest.strip_prefix("//") {
        let mut parts = qualified.splitn(2, '/');
        let space = parts.next().filter(|space| !space.is_empty())?;
        return match parts.next() {
            None => Some((Some(space), None)),
            Some(entity) if !entity.is_empty() && !entity.contains('/') => Some((Some(space), Some(entity))),
            _ => None,
        };
    }
    let legacy = rest.strip_prefix('/')?;
    (!legacy.is_empty() && !legacy.contains('/')).then_some((None, Some(legacy)))
}

/// The canonical spelling of an EID (`echo:/<id>` becomes `echo:///<id>`).
fn normalize_eid(uri: &str) -> String {
    match parse_eid(uri) {
        Some((None, Some(entity))) => format!("echo:///{entity}"),
        _ => uri.to_owned(),
    }
}

/// The bare local entity id of a reference within `space_id`, as index-core's `localEntityId` reads it.
pub fn local_entity_id(uri: Option<&str>, space_id: &str) -> Option<String> {
    let (space, entity) = parse_eid(uri?)?;
    if space.is_some_and(|space| space != space_id) {
        return None;
    }
    entity.map(str::to_owned)
}

/// The key a reverse-reference row is filed under, as echo-protocol's `referenceIndexKey` computes it.
pub fn reference_index_key(uri: &str) -> Option<String> {
    if let Some((_, entity)) = parse_eid(uri) {
        return entity.map(|entity| format!("echo:///{entity}"));
    }
    if let Some(rest) = uri.strip_prefix("dxn:") {
        let name: String = rest.chars().take_while(|char| *char != ':' && *char != '#').collect();
        return (!name.is_empty()).then(|| format!("dxn:{name}"));
    }
    Some(uri.to_owned())
}

/// Outgoing references of an object's JSON (excluding `@meta`), each with its escaped property path and
/// the same path without array indexes.
pub fn extract_references(json: &Json) -> Vec<(String, String, String)> {
    fn visit(path: &mut Vec<String>, value: &Json, out: &mut Vec<(String, String, String)>) {
        match value {
            Json::Object(map) => {
                if map.len() == 1 {
                    if let Some(Json::String(uri)) = map.get("/") {
                        if let Some(target) = reference_index_key(uri) {
                            let normalized: Vec<String> =
                                path.iter().filter(|segment| !segment.bytes().all(|byte| byte.is_ascii_digit()) || segment.is_empty()).cloned().collect();
                            out.push((target, escape_path(path), escape_path(&normalized)));
                        }
                        return;
                    }
                }
                for (key, inner) in map {
                    path.push(key.clone());
                    visit(path, inner, out);
                    path.pop();
                }
            }
            Json::Array(items) => {
                for (index, inner) in items.iter().enumerate() {
                    path.push(index.to_string());
                    visit(path, inner, out);
                    path.pop();
                }
            }
            _ => {}
        }
    }
    let mut out = Vec::new();
    if let Json::Object(map) = json {
        for (key, inner) in map {
            if key == "@meta" {
                continue;
            }
            let mut path = vec![key.clone()];
            visit(&mut path, inner, &mut out);
        }
    }
    out
}

fn escape_path(path: &[String]) -> String {
    path.iter().map(|segment| segment.replace('\\', "\\\\").replace('.', "\\.")).collect::<Vec<_>>().join(".")
}

/// Normalizes a stored type URI as index-core does: an `echo:` type collapses to its local form.
pub fn normalize_type_uri(uri: &str) -> String {
    if !uri.starts_with("echo:") {
        return uri.to_owned();
    }
    match parse_eid(uri) {
        Some((_, Some(entity))) => format!("echo:///{entity}"),
        _ => uri.to_owned(),
    }
}
