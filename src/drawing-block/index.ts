// types & branded IDs (Brand is internal, not re-exported)
export type {
  DrawingId,
  ElementId,
  HistoryGroupId,
  DrawingElement,
  DrawingAppState,
  DrawingFiles,
  DrawingScene,
} from "./types.js";
export { createDrawingId, createElementId, createHistoryGroupId } from "./types.js";

// actions & patches
export type {
  AddElementPatch,
  UpdateElementPatch,
  DeleteElementPatch,
  SetAppStatePatch,
  UpsertFilesPatch,
  DrawingPatch,
  DrawingAction,
} from "./actions.js";

// patch application
export { applyElementPatch, applyAppStatePatch, applyFilesPatch, applyPatches } from "./apply.js";

// history
export type { DrawingHistoryState } from "./history.js";
export {
  createInitialHistoryState,
  advanceHistory,
  canUndo,
  canRedo,
  undoHistoryState,
  redoHistoryState,
  applyUndo,
  applyRedo,
} from "./history.js";

// engine interface & default implementation
export type { DrawingEngine, EngineSnapshot, EngineSelection, EngineEvents } from "./engine.js";
export { DefaultDrawingEngine } from "./default-engine.js";

// action recorder
export { ActionRecorder, type ActionRecorderState } from "./action-recorder.js";

// emitter
export { Emitter } from "./emitter.js";

// controller (orchestrator)
export {
  DrawingBlockController,
  type DrawingBlockConfig,
  type DrawingBlockState,
  type StateChangeCallback,
} from "./controller.js";
