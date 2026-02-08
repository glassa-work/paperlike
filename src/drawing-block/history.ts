// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import type { DrawingScene } from "./types.js";
import type { DrawingAction } from "./actions.js";
import { applyPatches } from "./apply.js";

/** Drawing history state for persistent undo/redo */
export interface DrawingHistoryState {
  /** Current position in the history stack (0-based, -1 means at base) */
  readonly undoCursor: number;
  /** Total number of actions in the history */
  readonly actionCount: number;
}

/** Create initial empty history state */
export const createInitialHistoryState = (): DrawingHistoryState => ({
  undoCursor: -1,
  actionCount: 0,
});

/** Update history state after a new action is appended */
export const advanceHistory = (state: DrawingHistoryState): DrawingHistoryState => ({
  undoCursor: state.actionCount,
  actionCount: state.actionCount + 1,
});

/** Check if undo is possible */
export const canUndo = (state: DrawingHistoryState): boolean => state.undoCursor >= 0;

/** Check if redo is possible */
export const canRedo = (state: DrawingHistoryState): boolean =>
  state.undoCursor < state.actionCount - 1;

/** Update history state for undo */
export const undoHistoryState = (state: DrawingHistoryState): DrawingHistoryState => {
  if (!canUndo(state)) return state;
  return { ...state, undoCursor: state.undoCursor - 1 };
};

/** Update history state for redo */
export const redoHistoryState = (state: DrawingHistoryState): DrawingHistoryState => {
  if (!canRedo(state)) return state;
  return { ...state, undoCursor: state.undoCursor + 1 };
};

/** Apply undo: use inverse patches of the action at undoCursor */
export const applyUndo = (
  scene: DrawingScene,
  actions: readonly DrawingAction[],
  state: DrawingHistoryState,
): DrawingScene => {
  if (!canUndo(state)) return scene;
  const action = actions[state.undoCursor];
  if (!action) return scene;
  return applyPatches(scene, action.inverse);
};

/** Apply redo: use forward patches of the action after undoCursor */
export const applyRedo = (
  scene: DrawingScene,
  actions: readonly DrawingAction[],
  state: DrawingHistoryState,
): DrawingScene => {
  if (!canRedo(state)) return scene;
  const action = actions[state.undoCursor + 1];
  if (!action) return scene;
  return applyPatches(scene, action.forward);
};
