import type { DrawingId, ElementId, HistoryGroupId } from "../types/ids.js";
import type { DrawingElement, DrawingAppState, DrawingFiles, DrawingScene } from "../types/drawing.js";
import type { DrawingAction, DrawingPatch } from "../drawing/actions.js";
import type { DrawingEngine, EngineSnapshot } from "./engine.js";
import {
  createInitialHistoryState,
  advanceHistory,
  canUndo,
  canRedo,
  undoHistoryState,
  redoHistoryState,
  type DrawingHistoryState,
} from "../drawing/history.js";
import { applyPatches } from "../drawing/apply.js";

// ---------------------------------------------------------------------------
// DrawingBlockController — coordinates a DrawingEngine with persistent
// undo/redo history. The engine is injected (Dependency Inversion) so
// internals can be swapped without changing the controller.
// ---------------------------------------------------------------------------

/** Configuration for creating a new controller. */
export interface DrawingBlockConfig {
  readonly drawingId: DrawingId;
  readonly engine: DrawingEngine;
  readonly createHistoryGroupId: () => HistoryGroupId;
}

/** Read-only view of the controller's history state. */
export interface DrawingBlockState {
  readonly drawingId: DrawingId;
  readonly historyState: DrawingHistoryState;
  readonly actions: readonly DrawingAction[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/** Callback for state changes. */
export type StateChangeCallback = (state: DrawingBlockState) => void;

/**
 * DrawingBlockController owns the action log and undo/redo cursor for a
 * single drawing block. It delegates element storage to the injected
 * DrawingEngine (Single Responsibility).
 */
export class DrawingBlockController {
  private readonly drawingId: DrawingId;
  private readonly engine: DrawingEngine;
  private readonly createGroupId: () => HistoryGroupId;

  private actions: DrawingAction[] = [];
  private historyState: DrawingHistoryState = createInitialHistoryState();
  private listeners: StateChangeCallback[] = [];

  constructor(config: DrawingBlockConfig) {
    this.drawingId = config.drawingId;
    this.engine = config.engine;
    this.createGroupId = config.createHistoryGroupId;
  }

  // -- public API -------------------------------------------------------------

  /** Get a read-only view of the current state. */
  getState(): DrawingBlockState {
    return {
      drawingId: this.drawingId,
      historyState: this.historyState,
      actions: Object.freeze([...this.actions]),
      canUndo: canUndo(this.historyState),
      canRedo: canRedo(this.historyState),
    };
  }

  /** Get the current engine snapshot. */
  getSnapshot(): EngineSnapshot {
    return this.engine.getSnapshot();
  }

  /** Load a full scene (snapshot + history) — used on init / import. */
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
    this.actions = [...actions];
    this.historyState = historyState;
    this.emitChange();
  }

  // -- element operations (each records an undoable action) -------------------

  /** Add an element and record the action. */
  addElement(element: DrawingElement): void {
    const added = this.engine.addElement(element);
    this.recordAction(
      [{ type: "add_element", element: added }],
      [{ type: "delete_element", elementId: added.id }],
    );
  }

  /** Update an element and record the action. */
  updateElement(elementId: ElementId, patch: Partial<DrawingElement>): void {
    const before = this.engine.updateElement(elementId, patch);
    if (!before) return;
    this.recordAction(
      [{ type: "update_element", elementId, patch }],
      [{ type: "update_element", elementId, patch: extractReversePatch(before, patch) }],
    );
  }

  /** Delete an element and record the action. */
  deleteElement(elementId: ElementId): void {
    const removed = this.engine.deleteElement(elementId);
    if (!removed) return;
    this.recordAction(
      [{ type: "delete_element", elementId }],
      [{ type: "add_element", element: removed }],
    );
  }

  /** Update app state and record the action. */
  setAppState(patch: Partial<DrawingAppState>): void {
    const prev = this.engine.setAppState(patch);
    this.recordAction(
      [{ type: "set_app_state", patch }],
      [{ type: "set_app_state", patch: extractReversePatch(prev, patch) }],
    );
  }

  /** Upsert files. */
  upsertFiles(files: DrawingFiles): void {
    this.engine.upsertFiles(files);
    this.recordAction(
      [{ type: "upsert_files", files }],
      [{ type: "upsert_files", files: {} }], // inverse: no-op (files are additive in v1)
    );
  }

  // -- selection proxy --------------------------------------------------------

  setSelection(ids: ReadonlySet<ElementId>): void {
    this.engine.setSelection(ids);
  }

  // -- undo / redo ------------------------------------------------------------

  /** Undo the last action. */
  undo(): boolean {
    if (!canUndo(this.historyState)) return false;
    const action = this.actions[this.historyState.undoCursor];
    if (!action) return false;
    this.rebuildFromPatches(action.inverse);
    this.historyState = undoHistoryState(this.historyState);
    this.emitChange();
    return true;
  }

  /** Redo the next action. */
  redo(): boolean {
    if (!canRedo(this.historyState)) return false;
    const action = this.actions[this.historyState.undoCursor + 1];
    if (!action) return false;
    this.rebuildFromPatches(action.forward);
    this.historyState = redoHistoryState(this.historyState);
    this.emitChange();
    return true;
  }

  // -- subscriptions ----------------------------------------------------------

  /** Subscribe to state changes. Returns unsubscribe function. */
  onChange(cb: StateChangeCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  // -- private ----------------------------------------------------------------

  private recordAction(forward: DrawingPatch[], inverse: DrawingPatch[]): void {
    this.truncateRedoStack();
    const action: DrawingAction = {
      drawingId: this.drawingId,
      historyGroupId: this.createGroupId(),
      forward,
      inverse,
      timestamp: Date.now(),
    };
    this.actions.push(action);
    this.historyState = advanceHistory(this.historyState);
    this.emitChange();
  }

  /** Discard any actions after the current cursor (branching history). */
  private truncateRedoStack(): void {
    this.actions = this.actions.slice(0, this.historyState.undoCursor + 1);
  }

  /** Rebuild engine state by applying patches to the current scene. */
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

  private emitChange(): void {
    const state = this.getState();
    for (const cb of this.listeners) cb(state);
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
