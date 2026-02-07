import { describe, it, expect } from "vitest";
import type { DrawingScene } from "../types/drawing.js";
import type { DrawingAction } from "./actions.js";
import {
  createInitialHistoryState,
  advanceHistory,
  canUndo,
  canRedo,
  undoHistoryState,
  redoHistoryState,
  applyUndo,
  applyRedo,
} from "./history.js";
import { createDrawingId, createElementId, createHistoryGroupId } from "../types/ids.js";

const baseScene: DrawingScene = {
  drawingId: createDrawingId("d1"),
  elements: [{ id: createElementId("e1"), type: "rect", x: 0, y: 0, width: 10, height: 10 }],
  appState: {},
  files: {},
};

const sceneWithElement: DrawingScene = {
  ...baseScene,
  elements: [
    ...baseScene.elements,
    { id: createElementId("e2"), type: "circle", x: 5, y: 5, width: 20, height: 20 },
  ],
};

const action1: DrawingAction = {
  drawingId: createDrawingId("d1"),
  historyGroupId: createHistoryGroupId("hg-1"),
  forward: [
    {
      type: "add_element",
      element: { id: createElementId("e2"), type: "circle", x: 5, y: 5, width: 20, height: 20 },
    },
  ],
  inverse: [{ type: "delete_element", elementId: createElementId("e2") }],
  timestamp: 1000,
};

describe("createInitialHistoryState", () => {
  it("returns state with undoCursor -1 and actionCount 0", () => {
    const state = createInitialHistoryState();
    expect(state.undoCursor).toBe(-1);
    expect(state.actionCount).toBe(0);
  });
});

describe("advanceHistory", () => {
  it("moves cursor to the new action", () => {
    const state = advanceHistory(createInitialHistoryState());
    expect(state.undoCursor).toBe(0);
    expect(state.actionCount).toBe(1);
  });

  it("advances multiple times correctly", () => {
    let state = createInitialHistoryState();
    state = advanceHistory(state);
    state = advanceHistory(state);
    expect(state.undoCursor).toBe(1);
    expect(state.actionCount).toBe(2);
  });
});

describe("canUndo / canRedo", () => {
  it("cannot undo with no actions", () => {
    expect(canUndo(createInitialHistoryState())).toBe(false);
  });

  it("can undo after one action", () => {
    const state = advanceHistory(createInitialHistoryState());
    expect(canUndo(state)).toBe(true);
  });

  it("cannot redo at the top of the stack", () => {
    const state = advanceHistory(createInitialHistoryState());
    expect(canRedo(state)).toBe(false);
  });

  it("can redo after undo", () => {
    let state = advanceHistory(createInitialHistoryState());
    state = undoHistoryState(state);
    expect(canRedo(state)).toBe(true);
  });
});

describe("undoHistoryState / redoHistoryState", () => {
  it("decrements cursor on undo", () => {
    let state = advanceHistory(createInitialHistoryState());
    state = undoHistoryState(state);
    expect(state.undoCursor).toBe(-1);
  });

  it("does nothing if cannot undo", () => {
    const state = createInitialHistoryState();
    expect(undoHistoryState(state)).toEqual(state);
  });

  it("increments cursor on redo", () => {
    let state = advanceHistory(createInitialHistoryState());
    state = undoHistoryState(state);
    state = redoHistoryState(state);
    expect(state.undoCursor).toBe(0);
  });

  it("does nothing if cannot redo", () => {
    const state = advanceHistory(createInitialHistoryState());
    expect(redoHistoryState(state)).toEqual(state);
  });
});

describe("applyUndo", () => {
  it("applies inverse patches of the current action", () => {
    const state = advanceHistory(createInitialHistoryState());
    const result = applyUndo(sceneWithElement, [action1], state);
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]?.id).toBe("e1");
  });

  it("returns unchanged scene when cannot undo", () => {
    const result = applyUndo(baseScene, [action1], createInitialHistoryState());
    expect(result).toBe(baseScene);
  });
});

describe("applyRedo", () => {
  it("applies forward patches of the next action", () => {
    let state = advanceHistory(createInitialHistoryState());
    state = undoHistoryState(state);
    const result = applyRedo(baseScene, [action1], state);
    expect(result.elements).toHaveLength(2);
  });

  it("returns unchanged scene when cannot redo", () => {
    const state = advanceHistory(createInitialHistoryState());
    const result = applyRedo(sceneWithElement, [action1], state);
    expect(result).toBe(sceneWithElement);
  });
});
