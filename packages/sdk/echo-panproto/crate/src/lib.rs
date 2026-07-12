//! @dxos/echo-panproto wasm core: a generic, declarative ECHO<->lexicon transform
//! backed by panproto's transform engine. `migrationSpec` is data.

use std::collections::{HashMap, HashSet};

use serde::Deserialize;
use wasm_bindgen::prelude::*;

use panproto_expr::Expr;
use panproto_inst::parse::{parse_json, to_json};
use panproto_inst::poly::restrict_with_complement;
use panproto_inst::wtype::{CompiledMigration, FieldTransform};
use panproto_protocols::web_document::atproto::parse_lexicon;
use panproto_schema::Schema;

#[derive(Deserialize)]
struct FieldTransformSpec {
    /// Source vertex (anchor) whose extra_fields the transform writes to.
    vertex: String,
    /// The field key transformed.
    key: String,
    /// The expression AST (serde-serialized panproto_expr::Expr).
    expr: Expr,
    #[serde(default)]
    inverse: Option<Expr>,
}

#[derive(Deserialize)]
struct MigrationSpec {
    /// Vertex the record is rooted at, e.g. "echo.book:body".
    root_vertex: String,
    /// Source-vertex -> target-vertex remapping (identity entries allowed).
    #[serde(default)]
    vertex_map: HashMap<String, String>,
    /// Value-level field transforms.
    #[serde(default)]
    field_transforms: Vec<FieldTransformSpec>,
}

fn find_name(schema: &Schema, s: &str) -> Option<panproto_gat::Name> {
    schema.vertices.keys().find(|k| k.to_string() == s).cloned()
}

fn err(msg: impl std::fmt::Display) -> JsError {
    JsError::new(&msg.to_string())
}

/// Transform a record from the source lexicon to the target lexicon per `migration_spec`.
#[wasm_bindgen]
pub fn transform(
    src_lexicon: &str,
    tgt_lexicon: &str,
    migration_spec: &str,
    record: &str,
) -> Result<String, JsError> {
    let src_lex: serde_json::Value = serde_json::from_str(src_lexicon).map_err(err)?;
    let tgt_lex: serde_json::Value = serde_json::from_str(tgt_lexicon).map_err(err)?;
    let src_schema = parse_lexicon(&src_lex).map_err(|e| err(format!("src lexicon: {e:?}")))?;
    let tgt_schema = parse_lexicon(&tgt_lex).map_err(|e| err(format!("tgt lexicon: {e:?}")))?;
    let spec: MigrationSpec = serde_json::from_str(migration_spec).map_err(err)?;
    let rec: serde_json::Value = serde_json::from_str(record).map_err(err)?;

    let instance = parse_json(&src_schema, &spec.root_vertex, &rec)
        .map_err(|e| err(format!("parse_json: {e:?}")))?;

    // Apply value transforms within the source schema (identity structural remap). Structural
    // reshaping (flatten/nest) is handled by the TS ECHO adapter, not here.
    let _ = (&tgt_schema, &spec.vertex_map);
    let surviving_verts: HashSet<panproto_gat::Name> = src_schema.vertices.keys().cloned().collect();
    let vertex_remap: HashMap<panproto_gat::Name, panproto_gat::Name> =
        src_schema.vertices.keys().map(|k| (k.clone(), k.clone())).collect();

    // field_transforms keyed by source anchor Name.
    let mut field_transforms: HashMap<panproto_gat::Name, Vec<FieldTransform>> = HashMap::new();
    for ft in spec.field_transforms {
        let name = find_name(&src_schema, &ft.vertex)
            .ok_or_else(|| err(format!("transform vertex not found: {}", ft.vertex)))?;
        field_transforms.entry(name).or_default().push(FieldTransform::ApplyExpr {
            key: ft.key,
            expr: ft.expr,
            inverse: ft.inverse,
            coercion_class: panproto_gat::CoercionClass::Projection,
        });
    }

    let migration = CompiledMigration {
        surviving_verts,
        vertex_remap,
        field_transforms,
        ..Default::default()
    };

    let (out, _complement) = restrict_with_complement(&instance, &src_schema, &src_schema, &migration)
        .map_err(|e| err(format!("restrict: {e:?}")))?;
    Ok(to_json(&src_schema, &out).to_string())
}
