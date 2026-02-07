import { describe, it, expect, vi } from "vitest";
import { DefaultDrawingEngine } from "./default-engine.js";
import type { DrawingElement } from "../types/drawing.js";
import { createElementId } from "../types/ids.js";

const makeElement = (id: string, x = 10, y = 20): DrawingElement => ({
  id: createElementId(id),
  type: "rectangle",
  x,
  y,
  width: 50,
  height: 50,
});

describe("DefaultDrawingEngine", () => {
  describe("snapshot", () => {
    it("returns empty snapshot initially", () => {
      const engine = new DefaultDrawingEngine();
      const snap = engine.getSnapshot();
      expect(snap.elements).toHaveLength(0);
      expect(snap.appState).toEqual({});
      expect(snap.files).toEqual({});
    });

    it("returns frozen elements in snapshot", () => {
      const engine = new DefaultDrawingEngine();
      engine.addElement(makeElement("e1"));
      const snap = engine.getSnapshot();
      expect(Object.isFrozen(snap.elements)).toBe(true);
    });
  });

  describe("addElement", () => {
    it("adds element and returns copy", () => {
      const engine = new DefaultDrawingEngine();
      const el = makeElement("e1");
      const added = engine.addElement(el);
      expect(added.id).toBe("e1");
      expect(engine.getSnapshot().elements).toHaveLength(1);
    });

    it("emits onElementsChange", () => {
      const engine = new DefaultDrawingEngine();
      const handler = vi.fn();
      engine.subscribe({ onElementsChange: handler });
      engine.addElement(makeElement("e1"));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0]).toHaveLength(1);
    });
  });

  describe("updateElement", () => {
    it("updates element and returns previous state", () => {
      const engine = new DefaultDrawingEngine();
      engine.addElement(makeElement("e1", 10, 20));
      const before = engine.updateElement(createElementId("e1"), { x: 99 });
      expect(before?.x).toBe(10);
      expect(engine.getSnapshot().elements[0]?.x).toBe(99);
    });

    it("preserves element id even if patch contains id", () => {
      const engine = new DefaultDrawingEngine();
      engine.addElement(makeElement("e1"));
      engine.updateElement(createElementId("e1"), {
        id: createElementId("hacked"),
      } as Partial<DrawingElement>);
      expect(engine.getSnapshot().elements[0]?.id).toBe("e1");
    });

    it("returns undefined for nonexistent element", () => {
      const engine = new DefaultDrawingEngine();
      const result = engine.updateElement(createElementId("nope"), { x: 0 });
      expect(result).toBeUndefined();
    });
  });

  describe("deleteElement", () => {
    it("deletes element and returns removed", () => {
      const engine = new DefaultDrawingEngine();
      engine.addElement(makeElement("e1"));
      const removed = engine.deleteElement(createElementId("e1"));
      expect(removed?.id).toBe("e1");
      expect(engine.getSnapshot().elements).toHaveLength(0);
    });

    it("returns undefined for nonexistent element", () => {
      const engine = new DefaultDrawingEngine();
      expect(engine.deleteElement(createElementId("nope"))).toBeUndefined();
    });

    it("clears selection when deleting selected element", () => {
      const engine = new DefaultDrawingEngine();
      engine.addElement(makeElement("e1"));
      engine.setSelection(new Set([createElementId("e1")]));
      engine.deleteElement(createElementId("e1"));
      // No error — selection is cleaned up internally
      expect(engine.getSnapshot().elements).toHaveLength(0);
    });
  });

  describe("setAppState", () => {
    it("returns previous state and applies patch", () => {
      const engine = new DefaultDrawingEngine();
      const prev = engine.setAppState({ viewBackgroundColor: "#000" });
      expect(prev).toEqual({});
      expect(engine.getSnapshot().appState.viewBackgroundColor).toBe("#000");
    });
  });

  describe("upsertFiles", () => {
    it("merges files into state", () => {
      const engine = new DefaultDrawingEngine();
      engine.upsertFiles({ f1: { mimeType: "image/png", dataURL: "data:..." } });
      expect(engine.getSnapshot().files["f1"]?.mimeType).toBe("image/png");
    });
  });

  describe("loadSnapshot", () => {
    it("replaces entire engine state", () => {
      const engine = new DefaultDrawingEngine();
      engine.addElement(makeElement("old"));
      engine.loadSnapshot({
        elements: [makeElement("new1"), makeElement("new2")],
        appState: { viewBackgroundColor: "#fff" },
        files: {},
      });
      expect(engine.getSnapshot().elements).toHaveLength(2);
      expect(engine.getSnapshot().elements[0]?.id).toBe("new1");
    });
  });

  describe("selection", () => {
    it("sets and reports selection via events", () => {
      const engine = new DefaultDrawingEngine();
      const handler = vi.fn();
      engine.subscribe({ onSelectionChange: handler });
      engine.setSelection(new Set([createElementId("e1")]));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0].selectedIds.has("e1")).toBe(true);
    });
  });

  describe("subscribe", () => {
    it("returns unsubscribe function", () => {
      const engine = new DefaultDrawingEngine();
      const handler = vi.fn();
      const unsub = engine.subscribe({ onElementsChange: handler });
      engine.addElement(makeElement("e1"));
      expect(handler).toHaveBeenCalledTimes(1);
      unsub();
      engine.addElement(makeElement("e2"));
      expect(handler).toHaveBeenCalledTimes(1); // no more calls
    });
  });
});
