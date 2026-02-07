import { test, expect } from "@playwright/test";
import {
  createDrawingId,
  createElementId,
  createHistoryGroupId,
} from "../src/types/ids.js";
import { applyPatches, applyElementPatch } from "../src/drawing/apply.js";
import {
  createInitialHistoryState,
  advanceHistory,
  canUndo,
  canRedo,
  undoHistoryState,
  redoHistoryState,
  applyUndo,
  applyRedo,
} from "../src/drawing/history.js";
import type { DrawingScene, DrawingElement } from "../src/types/drawing.js";
import type { DrawingAction, DrawingPatch } from "../src/drawing/actions.js";

const makeElement = (id: string, type: string, x: number, y: number): DrawingElement => ({
  id: createElementId(id),
  type,
  x,
  y,
  width: 50,
  height: 50,
});

const makeScene = (): DrawingScene => ({
  drawingId: createDrawingId("drawing-e2e"),
  elements: [],
  appState: { viewBackgroundColor: "#ffffff" },
  files: {},
});

test.describe("Drawing Stream E2E: draw strokes → undo/redo across sessions", () => {
  test("full drawing lifecycle: add elements → update → delete → undo/redo chain", () => {
    let scene = makeScene();
    let historyState = createInitialHistoryState();
    const actions: DrawingAction[] = [];

    // Step 1: Add a rectangle
    const rect = makeElement("rect1", "rectangle", 10, 20);
    const action1: DrawingAction = {
      drawingId: scene.drawingId,
      historyGroupId: createHistoryGroupId("hg-1"),
      forward: [{ type: "add_element", element: rect }],
      inverse: [{ type: "delete_element", elementId: rect.id }],
      timestamp: 1000,
    };
    scene = applyPatches(scene, action1.forward);
    actions.push(action1);
    historyState = advanceHistory(historyState);

    expect(scene.elements).toHaveLength(1);
    expect(scene.elements[0]?.type).toBe("rectangle");

    // Step 2: Add a circle
    const circle = makeElement("circle1", "ellipse", 100, 100);
    const action2: DrawingAction = {
      drawingId: scene.drawingId,
      historyGroupId: createHistoryGroupId("hg-2"),
      forward: [{ type: "add_element", element: circle }],
      inverse: [{ type: "delete_element", elementId: circle.id }],
      timestamp: 2000,
    };
    scene = applyPatches(scene, action2.forward);
    actions.push(action2);
    historyState = advanceHistory(historyState);

    expect(scene.elements).toHaveLength(2);

    // Step 3: Update rectangle position
    const action3: DrawingAction = {
      drawingId: scene.drawingId,
      historyGroupId: createHistoryGroupId("hg-3"),
      forward: [{ type: "update_element", elementId: rect.id, patch: { x: 50, y: 60 } }],
      inverse: [{ type: "update_element", elementId: rect.id, patch: { x: 10, y: 20 } }],
      timestamp: 3000,
    };
    scene = applyPatches(scene, action3.forward);
    actions.push(action3);
    historyState = advanceHistory(historyState);

    expect(scene.elements[0]?.x).toBe(50);
    expect(scene.elements[0]?.y).toBe(60);

    // Step 4: Undo the position update
    expect(canUndo(historyState)).toBe(true);
    scene = applyUndo(scene, actions, historyState);
    historyState = undoHistoryState(historyState);

    expect(scene.elements[0]?.x).toBe(10);
    expect(scene.elements[0]?.y).toBe(20);

    // Step 5: Undo the circle add
    scene = applyUndo(scene, actions, historyState);
    historyState = undoHistoryState(historyState);

    expect(scene.elements).toHaveLength(1);
    expect(scene.elements[0]?.type).toBe("rectangle");

    // Step 6: Redo the circle add
    expect(canRedo(historyState)).toBe(true);
    scene = applyRedo(scene, actions, historyState);
    historyState = redoHistoryState(historyState);

    expect(scene.elements).toHaveLength(2);

    // Step 7: Redo the position update
    scene = applyRedo(scene, actions, historyState);
    historyState = redoHistoryState(historyState);

    expect(scene.elements[0]?.x).toBe(50);
    expect(scene.elements[0]?.y).toBe(60);
  });

  test("persistent undo/redo across simulated sessions", () => {
    // Session 1: Create a drawing, add elements, save history
    let scene = makeScene();
    let historyState = createInitialHistoryState();
    const actions: DrawingAction[] = [];

    const elem = makeElement("line1", "line", 0, 0);
    const action: DrawingAction = {
      drawingId: scene.drawingId,
      historyGroupId: createHistoryGroupId("session1-hg"),
      forward: [{ type: "add_element", element: elem }],
      inverse: [{ type: "delete_element", elementId: elem.id }],
      timestamp: 1000,
    };
    scene = applyPatches(scene, action.forward);
    actions.push(action);
    historyState = advanceHistory(historyState);

    // Simulate saving state (serialize/deserialize)
    const savedScene = JSON.parse(JSON.stringify(scene)) as DrawingScene;
    const savedActions = JSON.parse(JSON.stringify(actions)) as DrawingAction[];
    const savedHistoryState = JSON.parse(JSON.stringify(historyState));

    // Session 2: Restore state and verify undo still works
    let restoredScene = savedScene;
    let restoredHistoryState = savedHistoryState;

    expect(canUndo(restoredHistoryState)).toBe(true);
    restoredScene = applyUndo(restoredScene, savedActions, restoredHistoryState);
    restoredHistoryState = undoHistoryState(restoredHistoryState);

    expect(restoredScene.elements).toHaveLength(0);

    // Redo also works in restored session
    expect(canRedo(restoredHistoryState)).toBe(true);
    restoredScene = applyRedo(restoredScene, savedActions, restoredHistoryState);
    restoredHistoryState = redoHistoryState(restoredHistoryState);

    expect(restoredScene.elements).toHaveLength(1);
    expect(restoredScene.elements[0]?.id).toBe("line1");
  });

  test("drawing patches: app state and file updates", () => {
    let scene = makeScene();

    // Update background color
    const patches: DrawingPatch[] = [
      { type: "set_app_state", patch: { viewBackgroundColor: "#000000" } },
      {
        type: "upsert_files",
        files: { "img-1": { mimeType: "image/png", dataURL: "data:image/png;base64,abc" } },
      },
    ];

    scene = applyPatches(scene, patches);
    expect(scene.appState.viewBackgroundColor).toBe("#000000");
    expect(scene.files["img-1"]?.mimeType).toBe("image/png");
  });
});
