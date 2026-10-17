//! Feasibility spike: link automerge, samod-core, and sedimentree/subduction into one wasm32 binary.
use automerge::{transaction::Transactable, AutoCommit, ReadDoc, ROOT};
use wasm_bindgen::prelude::*;

/// Creates an ECHO-shaped automerge doc, saves it, and reloads it.
#[wasm_bindgen]
pub fn automerge_roundtrip(n: u32) -> usize {
    let mut doc = AutoCommit::new();
    let objects = doc
        .put_object(ROOT, "objects", automerge::ObjType::Map)
        .unwrap();
    for i in 0..n {
        let obj = doc
            .put_object(&objects, format!("obj{i}"), automerge::ObjType::Map)
            .unwrap();
        let data = doc
            .put_object(&obj, "data", automerge::ObjType::Map)
            .unwrap();
        doc.put(&data, "title", format!("Object {i}")).unwrap();
        let text = doc
            .put_object(&data, "content", automerge::ObjType::Text)
            .unwrap();
        doc.splice_text(&text, 0, 0, "hello").unwrap();
    }
    let bytes = doc.save();
    let loaded = AutoCommit::load(&bytes).unwrap();
    loaded.length(&objects) + bytes.len()
}

/// Owns a samod-core hub and its document actors, so the sync protocol links in full.
#[wasm_bindgen]
pub struct SpikeRepo {
    loader: Option<samod_core::SamodLoader>,
    hub: Option<Box<samod_core::actors::hub::Hub>>,
    actors: Vec<samod_core::actors::DocumentActor>,
}

#[wasm_bindgen]
impl SpikeRepo {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SpikeRepo {
        let mut rng = rand::rng();
        let peer = samod_core::PeerId::new_with_rng(&mut rng);
        SpikeRepo {
            loader: Some(samod_core::SamodLoader::new(peer)),
            hub: None,
            actors: Vec::new(),
        }
    }

    /// Steps the loader until the hub is ready; returns pending IO count.
    pub fn step_loader(&mut self, now_ms: f64) -> usize {
        let mut rng = rand::rng();
        let now = samod_core::UnixTimestamp::from_millis(now_ms as u128);
        if let Some(loader) = self.loader.as_mut() {
            match loader.step(&mut rng, now) {
                samod_core::LoaderState::NeedIo(tasks) => return tasks.len(),
                samod_core::LoaderState::Loaded(hub) => {
                    self.hub = Some(hub);
                    self.loader = None;
                }
            }
        }
        0
    }

    /// Feeds a network message and a create-document command through the hub and spawns actors.
    pub fn receive(&mut self, conn: u32, msg: Vec<u8>, now_ms: f64) -> usize {
        let mut rng = rand::rng();
        let now = samod_core::UnixTimestamp::from_millis(now_ms as u128);
        let Some(hub) = self.hub.as_mut() else {
            return 0;
        };
        let mut total = 0;
        let conns = hub.connections();
        if let Some(info) = conns.into_iter().nth(conn as usize) {
            let cmd = samod_core::actors::hub::HubEvent::receive(info.id, msg);
            let results = hub.handle_event(&mut rng, now, cmd.event);
            total += results.new_tasks.len();
            for args in results.spawn_actors {
                let (actor, out) = samod_core::actors::DocumentActor::new(now, args);
                total += out.io_tasks.len();
                self.actors.push(actor);
            }
            for (_id, m) in results.actor_messages {
                for actor in self.actors.iter_mut() {
                    let out = actor.handle_message(now, m.clone());
                    total += out.map(|o| o.io_tasks.len()).unwrap_or(0);
                }
            }
        }
        let created =
            samod_core::actors::hub::HubEvent::create_document(automerge::Automerge::new());
        let results = hub.handle_event(&mut rng, now, created.event);
        total + results.spawn_actors.len()
    }
}

/// Summarizes and minimizes an empty sedimentree, the two steps subduction runs on every sync round.
#[wasm_bindgen]
pub fn sedimentree_summary(seed: &[u8]) -> usize {
    use sedimentree_core::sedimentree::Sedimentree;
    let tree = Sedimentree::new(Vec::new(), Vec::new());
    let mut seed_bytes = [0u8; 16];
    for (i, b) in seed.iter().take(16).enumerate() {
        seed_bytes[i] = *b;
    }
    let summary = tree.fingerprint_summarize(
        &sedimentree_core::crypto::fingerprint::FingerprintSeed::new(
            u64::from_le_bytes(seed_bytes[0..8].try_into().unwrap()),
            u64::from_le_bytes(seed_bytes[8..16].try_into().unwrap()),
        ),
    );
    let minimized = tree.minimize(&sedimentree_core::depth::CountLeadingZeroBytes);
    core::mem::size_of_val(&summary) + minimized.loose_commits().count()
}

/// Forces the subduction wasm bindings into this cdylib so its exports ship in the same binary.
pub use automerge_subduction_wasm as subduction;
