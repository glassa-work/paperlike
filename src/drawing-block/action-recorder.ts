// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import type { DrawingId, HistoryGroupId } from "./types.js";
import type { DrawingAction, DrawingPatch } from "./actions.js";
import {
  createInitialHistoryState,
  advanceHistory,
  canUndo,
  canRedo,
  undoHistoryState,
  redoHistoryState,
  type DrawingHistoryState,
} from "./history.js";

/** Read-only view of the action recorder's state. */
export interface ActionRecorderState {
  readonly historyState: DrawingHistoryState;
  readonly actions: readonly DrawingAction[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/**
 * ActionRecorder owns the action log and undo/redo cursor for a drawing.
 * It knows nothing about engines — it only tracks forward/inverse patch
 * pairs and manages history state.
 */
export class ActionRecorder {
  private actions: DrawingAction[] = [];
  private historyState: DrawingHistoryState = createInitialHistoryState();

  constructor(
    private readonly drawingId: DrawingId,
    private readonly createGroupId: () => HistoryGroupId,
  ) {}

  /** Get a read-only snapshot of the current state. */
  getState(): ActionRecorderState {
    return {
      historyState: this.historyState,
      actions: Object.freeze([...this.actions]),
      canUndo: canUndo(this.historyState),
      canRedo: canRedo(this.historyState),
    };
  }

  /** Record a new action and advance the cursor. Truncates any redo stack. */
  record(forward: DrawingPatch[], inverse: DrawingPatch[]): void {
    this.actions = this.actions.slice(0, this.historyState.undoCursor + 1);
    const action: DrawingAction = {
      drawingId: this.drawingId,
      historyGroupId: this.createGroupId(),
      forward,
      inverse,
      timestamp: Date.now(),
    };
    this.actions.push(action);
    this.historyState = advanceHistory(this.historyState);
  }

  /** Move the undo cursor back and return the inverse patches. */
  undo(): readonly DrawingPatch[] | null {
    if (!canUndo(this.historyState)) return null;
    const action = this.actions[this.historyState.undoCursor];
    if (!action) return null;
    this.historyState = undoHistoryState(this.historyState);
    return action.inverse;
  }

  /** Move the redo cursor forward and return the forward patches. */
  redo(): readonly DrawingPatch[] | null {
    if (!canRedo(this.historyState)) return null;
    const action = this.actions[this.historyState.undoCursor + 1];
    if (!action) return null;
    this.historyState = redoHistoryState(this.historyState);
    return action.forward;
  }

  /** Replace the entire action log and history state (used on load/import). */
  load(actions: readonly DrawingAction[], historyState: DrawingHistoryState): void {
    this.actions = [...actions];
    this.historyState = historyState;
  }
}
