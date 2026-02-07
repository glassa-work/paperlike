import { describe, it, expect, vi } from "vitest";
import { DrawingBlockController } from "./controller.js";
import { DefaultDrawingEngine } from "./default-engine.js";
import type { DrawingScene } from "../types/drawing.js";
import type { DrawingAction } from "../drawing/actions.js";
import type { DrawingHistoryState } from "../drawing/history.js";
import { createDrawingId, createElementId, createHistoryGroupId } from "../types/ids.js";
import type { DrawingElement } from "../types/drawing.js";

let groupCounter = 0;
const makeGroupId = () => createHistoryGroupId(`hg-${++groupCounter}`);

const makeController = () => {
  const drawingId = createDrawingId("d-test");
  const engine = new DefaultDrawingEngine();
  return new DrawingBlockController({
    drawingId,
    engine,
    createHistoryGroupId: makeGroupId,
  });
};

const makeElement = (id: string): DrawingElement => ({
  id: createElementId(id),
  type: "rectangle",
  x: 10,
  y: 20,
  width: 50,
  height: 50,
});

describe("DrawingBlockController", () => {
  describe("initial state", () => {
    it("starts with empty history", () => {
      const ctrl = makeController();
      const state = ctrl.getState();
      expect(state.actions).toHaveLength(0);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });

    it("starts with empty snapshot", () => {
      const ctrl = makeController();
      const snap = ctrl.getSnapshot();
      expect(snap.elements).toHaveLength(0);
    });
  });

  describe("addElement", () => {
    it("adds element and records action", () => {
      const ctrl = makeController();
      ctrl.addElement(makeElement("e1"));
      expect(ctrl.getSnapshot().elements).toHaveLength(1);
      expect(ctrl.getState().actions).toHaveLength(1);
      expect(ctrl.getState().canUndo).toBe(true);
    });
  });

  describe("updateElement", () => {
    it("updates element and records reversible action", () => {
      const ctrl = makeController();
      ctrl.addElement(makeElement("e1"));
      ctrl.updateElement(createElementId("e1"), { x: 99 });
      expect(ctrl.getSnapshot().elements[0]?.x).toBe(99);
      expect(ctrl.getState().actions).toHaveLength(2);
    });

    it("ignores update on nonexistent element", () => {
      const ctrl = makeController();
      ctrl.updateElement(createElementId("nope"), { x: 99 });
      expect(ctrl.getState().actions).toHaveLength(0);
    });
  });

  describe("deleteElement", () => {
    it("deletes element and records reversible action", () => {
      const ctrl = makeController();
      ctrl.addElement(makeElement("e1"));
      ctrl.deleteElement(createElementId("e1"));
      expect(ctrl.getSnapshot().elements).toHaveLength(0);
      expect(ctrl.getState().actions).toHaveLength(2);
    });
  });

  describe("setAppState", () => {
    it("updates app state and records action", () => {
      const ctrl = makeController();
      ctrl.setAppState({ viewBackgroundColor: "#000" });
      expect(ctrl.getSnapshot().appState.viewBackgroundColor).toBe("#000");
      expect(ctrl.getState().actions).toHaveLength(1);
    });
  });

  describe("undo / redo", () => {
    it("undoes last action", () => {
      const ctrl = makeController();
      ctrl.addElement(makeElement("e1"));
      expect(ctrl.undo()).toBe(true);
      expect(ctrl.getSnapshot().elements).toHaveLength(0);
    });

    it("redoes undone action", () => {
      const ctrl = makeController();
      ctrl.addElement(makeElement("e1"));
      ctrl.undo();
      expect(ctrl.redo()).toBe(true);
      expect(ctrl.getSnapshot().elements).toHaveLength(1);
    });

    it("returns false when nothing to undo", () => {
      const ctrl = makeController();
      expect(ctrl.undo()).toBe(false);
    });

    it("returns false when nothing to redo", () => {
      const ctrl = makeController();
      expect(ctrl.redo()).toBe(false);
    });

    it("truncates redo stack on new action after undo", () => {
      const ctrl = makeController();
      ctrl.addElement(makeElement("e1"));
      ctrl.addElement(makeElement("e2"));
      ctrl.undo(); // undo e2
      ctrl.addElement(makeElement("e3")); // branch
      expect(ctrl.getState().canRedo).toBe(false);
      expect(ctrl.getSnapshot().elements).toHaveLength(2);
      expect(ctrl.getSnapshot().elements[1]?.id).toBe("e3");
    });

    it("multi-step undo/redo preserves state", () => {
      const ctrl = makeController();
      ctrl.addElement(makeElement("e1"));
      ctrl.updateElement(createElementId("e1"), { x: 50 });
      ctrl.addElement(makeElement("e2"));

      // Undo all three
      ctrl.undo(); // remove e2
      ctrl.undo(); // restore x=10
      ctrl.undo(); // remove e1
      expect(ctrl.getSnapshot().elements).toHaveLength(0);

      // Redo all three
      ctrl.redo();
      ctrl.redo();
      ctrl.redo();
      expect(ctrl.getSnapshot().elements).toHaveLength(2);
      expect(ctrl.getSnapshot().elements[0]?.x).toBe(50);
    });
  });

  describe("loadScene", () => {
    it("restores full scene with history", () => {
      const ctrl = makeController();
      const scene: DrawingScene = {
        drawingId: createDrawingId("d-test"),
        elements: [makeElement("e1")],
        appState: { viewBackgroundColor: "#fff" },
        files: {},
      };
      const actions: DrawingAction[] = [
        {
          drawingId: createDrawingId("d-test"),
          historyGroupId: createHistoryGroupId("hg-loaded"),
          forward: [{ type: "add_element", element: makeElement("e1") }],
          inverse: [{ type: "delete_element", elementId: createElementId("e1") }],
          timestamp: 1000,
        },
      ];
      const historyState: DrawingHistoryState = { undoCursor: 0, actionCount: 1 };

      ctrl.loadScene(scene, actions, historyState);
      expect(ctrl.getSnapshot().elements).toHaveLength(1);
      expect(ctrl.getState().canUndo).toBe(true);
    });
  });

  describe("onChange", () => {
    it("notifies listeners on state changes", () => {
      const ctrl = makeController();
      const handler = vi.fn();
      ctrl.onChange(handler);
      ctrl.addElement(makeElement("e1"));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0].actions).toHaveLength(1);
    });

    it("returns unsubscribe function", () => {
      const ctrl = makeController();
      const handler = vi.fn();
      const unsub = ctrl.onChange(handler);
      ctrl.addElement(makeElement("e1"));
      unsub();
      ctrl.addElement(makeElement("e2"));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("selection proxy", () => {
    it("delegates selection to engine", () => {
      const ctrl = makeController();
      ctrl.addElement(makeElement("e1"));
      // Should not throw — just delegates
      ctrl.setSelection(new Set([createElementId("e1")]));
    });
  });
});
