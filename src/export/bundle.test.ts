import { describe, it, expect } from "vitest";
import type { DocumentSnapshot } from "../types/document.js";
import type { DrawingScene } from "../types/drawing.js";
import type { DrawingAction } from "../drawing/actions.js";
import type { DrawingHistoryState } from "../drawing/history.js";
import type { PaperlikeManifest } from "./manifest.js";
import {
  buildManifest,
  serializeBody,
  deserializeBody,
  serializeDrawingScene,
  deserializeDrawingScene,
  serializeDrawingHistory,
  deserializeDrawingHistory,
  serializeHistoryState,
  deserializeHistoryState,
  serializeManifest,
  deserializeManifest,
} from "./bundle.js";
import {
  createDocId,
  createDrawingId,
  createBlockId,
  createElementId,
  createHistoryGroupId,
} from "../types/ids.js";

const snapshot: DocumentSnapshot = {
  docId: createDocId("doc-1"),
  version: 1,
  blocks: [{ id: createBlockId("b1"), type: "paragraph", text: "Hello" }],
};

const scene: DrawingScene = {
  drawingId: createDrawingId("d1"),
  elements: [{ id: createElementId("e1"), type: "rect", x: 0, y: 0, width: 10, height: 10 }],
  appState: { viewBackgroundColor: "#fff" },
  files: {},
};

const action: DrawingAction = {
  drawingId: createDrawingId("d1"),
  historyGroupId: createHistoryGroupId("hg-1"),
  forward: [
    {
      type: "add_element",
      element: { id: createElementId("e2"), type: "circle", x: 0, y: 0, width: 5, height: 5 },
    },
  ],
  inverse: [{ type: "delete_element", elementId: createElementId("e2") }],
  timestamp: 1000,
};

const historyState: DrawingHistoryState = { undoCursor: 0, actionCount: 1 };

describe("body serialization", () => {
  it("round-trips body snapshot", () => {
    const json = serializeBody(snapshot);
    const parsed = deserializeBody(json);
    expect(parsed.docId).toBe("doc-1");
    expect(parsed.blocks).toHaveLength(1);
  });
});

describe("drawing scene serialization", () => {
  it("round-trips drawing scene", () => {
    const json = serializeDrawingScene(scene);
    const parsed = deserializeDrawingScene(json);
    expect(parsed.drawingId).toBe("d1");
    expect(parsed.elements).toHaveLength(1);
  });
});

describe("drawing history serialization", () => {
  it("round-trips drawing history as JSONL", () => {
    const jsonl = serializeDrawingHistory([action, action]);
    const parsed = deserializeDrawingHistory(jsonl);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.historyGroupId).toBe("hg-1");
  });

  it("handles empty history", () => {
    const jsonl = serializeDrawingHistory([]);
    const parsed = deserializeDrawingHistory(jsonl);
    expect(parsed).toHaveLength(0);
  });
});

describe("history state serialization", () => {
  it("round-trips history state", () => {
    const json = serializeHistoryState(historyState);
    const parsed = deserializeHistoryState(json);
    expect(parsed.undoCursor).toBe(0);
    expect(parsed.actionCount).toBe(1);
  });
});

describe("manifest", () => {
  it("builds a manifest from bundle data", () => {
    const drawings = new Map([[createDrawingId("d1"), { scene, history: [action], historyState }]]);
    const manifest = buildManifest({ body: snapshot, drawings, commentsState: null });
    expect(manifest.version).toBe("1.0");
    expect(manifest.docId).toBe("doc-1");
    expect(manifest.drawingIds).toEqual(["d1"]);
  });

  it("round-trips manifest serialization", () => {
    const manifest: PaperlikeManifest = {
      version: "1.0",
      docId: createDocId("doc-1"),
      createdAt: "2024-01-01T00:00:00.000Z",
      drawingIds: [createDrawingId("d1")],
    };
    const json = serializeManifest(manifest);
    const parsed = deserializeManifest(json);
    expect(parsed.docId).toBe("doc-1");
    expect(parsed.drawingIds).toEqual(["d1"]);
  });
});
