import type { DocumentSnapshot } from "../types/document.js";
import type { DrawingScene } from "../types/drawing.js";
import type { DrawingAction } from "../drawing/actions.js";
import type { DrawingHistoryState } from "../drawing/history.js";
import type { PaperlikeManifest } from "./manifest.js";
import type { DrawingId } from "../types/ids.js";

/** In-memory representation of a .paperlike bundle's contents */
export interface PaperlikeBundle {
  readonly manifest: PaperlikeManifest;
  readonly body: DocumentSnapshot;
  readonly drawings: ReadonlyMap<DrawingId, DrawingSceneBundle>;
  readonly commentsState: Uint8Array | null;
}

/** Bundle for a single drawing including scene, history, and state */
export interface DrawingSceneBundle {
  readonly scene: DrawingScene;
  readonly history: readonly DrawingAction[];
  readonly historyState: DrawingHistoryState;
}

/** Build a manifest from a bundle's data */
export const buildManifest = (bundle: Omit<PaperlikeBundle, "manifest">): PaperlikeManifest => ({
  version: "1.0",
  docId: bundle.body.docId,
  createdAt: new Date().toISOString(),
  drawingIds: [...bundle.drawings.keys()],
});

/** Serialize the body snapshot to JSON */
export const serializeBody = (snapshot: DocumentSnapshot): string => JSON.stringify(snapshot);

/** Deserialize a body snapshot from JSON */
export const deserializeBody = (json: string): DocumentSnapshot =>
  JSON.parse(json) as DocumentSnapshot;

/** Serialize a drawing scene to JSON */
export const serializeDrawingScene = (scene: DrawingScene): string => JSON.stringify(scene);

/** Deserialize a drawing scene from JSON */
export const deserializeDrawingScene = (json: string): DrawingScene =>
  JSON.parse(json) as DrawingScene;

/** Serialize drawing actions to JSONL (one JSON object per line) */
export const serializeDrawingHistory = (actions: readonly DrawingAction[]): string =>
  actions.map((a) => JSON.stringify(a)).join("\n");

/** Deserialize drawing actions from JSONL */
export const deserializeDrawingHistory = (jsonl: string): readonly DrawingAction[] => {
  if (!jsonl.trim()) return [];
  return jsonl
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as DrawingAction);
};

/** Serialize drawing history state to JSON */
export const serializeHistoryState = (state: DrawingHistoryState): string => JSON.stringify(state);

/** Deserialize drawing history state from JSON */
export const deserializeHistoryState = (json: string): DrawingHistoryState =>
  JSON.parse(json) as DrawingHistoryState;

/** Serialize a manifest to JSON */
export const serializeManifest = (manifest: PaperlikeManifest): string =>
  JSON.stringify(manifest, null, 2);

/** Deserialize a manifest from JSON */
export const deserializeManifest = (json: string): PaperlikeManifest =>
  JSON.parse(json) as PaperlikeManifest;
