// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import type { DrawingId, ElementId, HistoryGroupId } from "./types.js";
import type {
  DrawingElement,
  DrawingAppState,
  DrawingFiles,
  DrawingScene,
} from "./types.js";
import type { DrawingAction, DrawingPatch } from "./actions.js";
import type { DrawingEngine, EngineSnapshot } from "./engine.js";
import type { DrawingHistoryState } from "./history.js";
import { ActionRecorder, type ActionRecorderState } from "./action-recorder.js";
import { Emitter } from "./emitter.js";
import { applyPatches } from "./apply.js";

// ---------------------------------------------------------------------------
// DrawingBlockController — slim orchestrator that coordinates a DrawingEngine
// with an ActionRecorder for undo/redo. Each concern lives in its own class.
// ---------------------------------------------------------------------------

/** Configuration for creating a new controller. */
export interface DrawingBlockConfig {
  readonly drawingId: DrawingId;
  readonly engine: DrawingEngine;
  readonly createHistoryGroupId: () => HistoryGroupId;
}

/** Read-only view of the controller's state. */
export interface DrawingBlockState extends ActionRecorderState {
  readonly drawingId: DrawingId;
}

/** Callback for state changes. */
export type StateChangeCallback = (state: DrawingBlockState) => void;

/**
 * DrawingBlockController orchestrates a DrawingEngine and an ActionRecorder.
 * Element storage is delegated to the engine (DIP).
 * Action recording and undo/redo cursor are delegated to the recorder (SRP).
 * Event emission is delegated to a generic Emitter.
 */
export class DrawingBlockController {
  private readonly drawingId: DrawingId;
  private readonly engine: DrawingEngine;
  private readonly recorder: ActionRecorder;
  private readonly emitter = new Emitter<DrawingBlockState>();

  constructor(config: DrawingBlockConfig) {
    this.drawingId = config.drawingId;
    this.engine = config.engine;
    this.recorder = new ActionRecorder(config.drawingId, config.createHistoryGroupId);
  }

  // -- public API -----------------------------------------------------------

  getState(): DrawingBlockState {
    return { drawingId: this.drawingId, ...this.recorder.getState() };
  }

  getSnapshot(): EngineSnapshot {
    return this.engine.getSnapshot();
  }

  loadScene(
    scene: DrawingScene,
    actions: readonly DrawingAction[],
    historyState: DrawingHistoryState,
  ): void {
    this.engine.loadSnapshot({
      elements: scene.elements,
      appState: scene.appState,
      files: scene.files,
    });
    this.recorder.load(actions, historyState);
    this.emitter.emit(this.getState());
  }

  // -- element operations (each records an undoable action) -----------------

  addElement(element: DrawingElement): void {
    const added = this.engine.addElement(element);
    this.recorder.record(
      [{ type: "add_element", element: added }],
      [{ type: "delete_element", elementId: added.id }],
    );
    this.emitter.emit(this.getState());
  }

  updateElement(elementId: ElementId, patch: Partial<DrawingElement>): void {
    const before = this.engine.updateElement(elementId, patch);
    if (!before) return;
    this.recorder.record(
      [{ type: "update_element", elementId, patch }],
      [{ type: "update_element", elementId, patch: extractReversePatch(before, patch) }],
    );
    this.emitter.emit(this.getState());
  }

  deleteElement(elementId: ElementId): void {
    const removed = this.engine.deleteElement(elementId);
    if (!removed) return;
    this.recorder.record(
      [{ type: "delete_element", elementId }],
      [{ type: "add_element", element: removed }],
    );
    this.emitter.emit(this.getState());
  }

  setAppState(patch: Partial<DrawingAppState>): void {
    const prev = this.engine.setAppState(patch);
    this.recorder.record(
      [{ type: "set_app_state", patch }],
      [{ type: "set_app_state", patch: extractReversePatch(prev, patch) }],
    );
    this.emitter.emit(this.getState());
  }

  upsertFiles(files: DrawingFiles): void {
    this.engine.upsertFiles(files);
    this.recorder.record(
      [{ type: "upsert_files", files }],
      [{ type: "upsert_files", files: {} }],
    );
    this.emitter.emit(this.getState());
  }

  // -- selection proxy ------------------------------------------------------

  setSelection(ids: ReadonlySet<ElementId>): void {
    this.engine.setSelection(ids);
  }

  // -- undo / redo ----------------------------------------------------------

  undo(): boolean {
    const patches = this.recorder.undo();
    if (!patches) return false;
    this.rebuildFromPatches(patches);
    this.emitter.emit(this.getState());
    return true;
  }

  redo(): boolean {
    const patches = this.recorder.redo();
    if (!patches) return false;
    this.rebuildFromPatches(patches);
    this.emitter.emit(this.getState());
    return true;
  }

  // -- subscriptions --------------------------------------------------------

  onChange(cb: StateChangeCallback): () => void {
    return this.emitter.on(cb);
  }

  // -- private --------------------------------------------------------------

  private rebuildFromPatches(patches: readonly DrawingPatch[]): void {
    const snap = this.engine.getSnapshot();
    const scene: DrawingScene = {
      drawingId: this.drawingId,
      elements: snap.elements,
      appState: snap.appState,
      files: snap.files,
    };
    const updated = applyPatches(scene, patches);
    this.engine.loadSnapshot({
      elements: updated.elements,
      appState: updated.appState,
      files: updated.files,
    });
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Extract only the keys from `original` that are overwritten by `patch`. */
function extractReversePatch<T extends Record<string, unknown>>(
  original: T,
  patch: Partial<T>,
): Partial<T> {
  const reverse: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    reverse[key] = (original as Record<string, unknown>)[key];
  }
  return reverse as Partial<T>;
}
