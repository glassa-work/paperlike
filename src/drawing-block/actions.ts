// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import type {
  DrawingId,
  ElementId,
  HistoryGroupId,
  DrawingElement,
  DrawingAppState,
  DrawingFiles,
} from "./types.js";

/** Patch operation types for drawings */
export interface AddElementPatch {
  readonly type: "add_element";
  readonly element: DrawingElement;
}

export interface UpdateElementPatch {
  readonly type: "update_element";
  readonly elementId: ElementId;
  readonly patch: Partial<DrawingElement>;
}

export interface DeleteElementPatch {
  readonly type: "delete_element";
  readonly elementId: ElementId;
}

export interface SetAppStatePatch {
  readonly type: "set_app_state";
  readonly patch: Partial<DrawingAppState>;
}

export interface UpsertFilesPatch {
  readonly type: "upsert_files";
  readonly files: DrawingFiles;
}

/** Union of all patch operations */
export type DrawingPatch =
  | AddElementPatch
  | UpdateElementPatch
  | DeleteElementPatch
  | SetAppStatePatch
  | UpsertFilesPatch;

/** A drawing action with forward (apply) and inverse (undo) patches */
export interface DrawingAction {
  readonly drawingId: DrawingId;
  readonly historyGroupId: HistoryGroupId;
  readonly forward: readonly DrawingPatch[];
  readonly inverse: readonly DrawingPatch[];
  readonly timestamp: number;
}
