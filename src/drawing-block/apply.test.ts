import { describe, it, expect } from "vitest";
import type { DrawingScene, DrawingElement } from "./types.js";
import type { DrawingPatch } from "./actions.js";
import { applyElementPatch, applyAppStatePatch, applyFilesPatch, applyPatches } from "./apply.js";
import { createDrawingId, createElementId } from "./types.js";

const elem1: DrawingElement = {
  id: createElementId("e1"),
  type: "rectangle",
  x: 0,
  y: 0,
  width: 100,
  height: 50,
};

const elem2: DrawingElement = {
  id: createElementId("e2"),
  type: "ellipse",
  x: 10,
  y: 10,
  width: 50,
  height: 50,
};

const baseScene: DrawingScene = {
  drawingId: createDrawingId("d1"),
  elements: [elem1],
  appState: { viewBackgroundColor: "#ffffff" },
  files: {},
};

describe("applyElementPatch", () => {
  it("adds an element", () => {
    const patch: DrawingPatch = { type: "add_element", element: elem2 };
    const result = applyElementPatch([elem1], patch);
    expect(result).toHaveLength(2);
    expect(result[1]?.id).toBe("e2");
  });

  it("updates an element", () => {
    const patch: DrawingPatch = {
      type: "update_element",
      elementId: createElementId("e1"),
      patch: { x: 50 },
    };
    const result = applyElementPatch([elem1], patch);
    expect(result[0]?.x).toBe(50);
    expect(result[0]?.id).toBe("e1");
  });

  it("deletes an element", () => {
    const patch: DrawingPatch = { type: "delete_element", elementId: createElementId("e1") };
    const result = applyElementPatch([elem1, elem2], patch);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("e2");
  });

  it("returns unchanged elements for non-element patches", () => {
    const patch: DrawingPatch = {
      type: "set_app_state",
      patch: { viewBackgroundColor: "#000" },
    };
    const result = applyElementPatch([elem1], patch);
    expect(result).toEqual([elem1]);
  });
});

describe("applyAppStatePatch", () => {
  it("merges app state patch", () => {
    const patch: DrawingPatch = {
      type: "set_app_state",
      patch: { viewBackgroundColor: "#000000" },
    };
    const result = applyAppStatePatch({ viewBackgroundColor: "#fff" }, patch);
    expect(result.viewBackgroundColor).toBe("#000000");
  });

  it("returns unchanged app state for non-app-state patches", () => {
    const patch: DrawingPatch = { type: "add_element", element: elem1 };
    const state = { viewBackgroundColor: "#fff" };
    expect(applyAppStatePatch(state, patch)).toBe(state);
  });
});

describe("applyFilesPatch", () => {
  it("upserts files", () => {
    const patch: DrawingPatch = {
      type: "upsert_files",
      files: { f1: { mimeType: "image/png", dataURL: "data:..." } },
    };
    const result = applyFilesPatch({}, patch);
    expect(result.f1?.mimeType).toBe("image/png");
  });

  it("returns unchanged files for non-files patches", () => {
    const patch: DrawingPatch = { type: "add_element", element: elem1 };
    const files = {};
    expect(applyFilesPatch(files, patch)).toBe(files);
  });
});

describe("applyPatches", () => {
  it("applies multiple patches to a scene", () => {
    const patches: DrawingPatch[] = [
      { type: "add_element", element: elem2 },
      { type: "set_app_state", patch: { viewBackgroundColor: "#000" } },
      { type: "upsert_files", files: { f1: { mimeType: "image/png", dataURL: "data:..." } } },
    ];
    const result = applyPatches(baseScene, patches);
    expect(result.elements).toHaveLength(2);
    expect(result.appState.viewBackgroundColor).toBe("#000");
    expect(result.files.f1?.mimeType).toBe("image/png");
    expect(result.drawingId).toBe("d1");
  });

  it("handles empty patch list", () => {
    const result = applyPatches(baseScene, []);
    expect(result).toEqual(baseScene);
  });
});
