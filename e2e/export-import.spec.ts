import { test, expect } from "@playwright/test";
import {
  createDocId,
  createBlockId,
  createDrawingId,
  createElementId,
  createHistoryGroupId,
  createActorId,
  createCommentId,
} from "../src/types/ids.js";
import { insertBlock } from "../src/body/apply.js";
import { applyPatches } from "../src/drawing/apply.js";
import {
  createInitialHistoryState,
  advanceHistory,
  canUndo,
  applyUndo,
  undoHistoryState,
} from "../src/drawing/history.js";
import {
  createCommentsDoc,
  addComment,
  getComments,
  encodeState,
  applyUpdate,
} from "../src/comments/crdt.js";
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
} from "../src/export/bundle.js";
import type { ParagraphBlock, DrawingRefBlock } from "../src/types/blocks.js";
import type { DocumentSnapshot } from "../src/types/document.js";
import type { DrawingScene } from "../src/types/drawing.js";
import type { DrawingAction } from "../src/drawing/actions.js";
import type { DrawingHistoryState } from "../src/drawing/history.js";
import type { CommentAnchor } from "../src/comments/types.js";
import type { PaperlikeBundle, DrawingSceneBundle } from "../src/export/bundle.js";

test.describe("Export/Import E2E: .paperlike bundle round-trip", () => {
  test("full lifecycle: create doc → edit → draw → comment → export → import → verify", () => {
    const docId = createDocId("doc-full-e2e");
    const drawingId = createDrawingId("draw-1");

    // === BUILD DOCUMENT ===

    // Body: create blocks
    const para: ParagraphBlock = {
      id: createBlockId("p1"),
      type: "paragraph",
      text: "Hello, Paperlike!",
    };
    const drawingRef: DrawingRefBlock = {
      id: createBlockId("dr1"),
      type: "drawing_ref",
      drawingId,
    };
    let blocks = insertBlock([], para, null);
    blocks = insertBlock(blocks, drawingRef, createBlockId("p1"));

    const bodySnapshot: DocumentSnapshot = {
      docId,
      version: 2,
      blocks,
    };

    // Drawing: create scene with elements
    let scene: DrawingScene = {
      drawingId,
      elements: [],
      appState: { viewBackgroundColor: "#ffffff" },
      files: {},
    };
    const rect = {
      id: createElementId("e1"),
      type: "rectangle",
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    };
    const addAction: DrawingAction = {
      drawingId,
      historyGroupId: createHistoryGroupId("hg-1"),
      forward: [{ type: "add_element" as const, element: rect }],
      inverse: [{ type: "delete_element" as const, elementId: rect.id }],
      timestamp: 1000,
    };
    scene = applyPatches(scene, addAction.forward);
    const actions: DrawingAction[] = [addAction];
    let historyState = advanceHistory(createInitialHistoryState());

    // Comments
    const commentsDoc = createCommentsDoc();
    const anchor: CommentAnchor = { kind: "block", blockId: createBlockId("p1") };
    addComment(
      commentsDoc,
      createCommentId("c1"),
      docId,
      createActorId("author-1"),
      anchor,
      "Looks great!",
      Date.now(),
    );
    const commentsState = encodeState(commentsDoc);

    // === EXPORT BUNDLE ===

    const drawingBundle: DrawingSceneBundle = {
      scene,
      history: actions,
      historyState,
    };
    const drawings = new Map([[drawingId, drawingBundle]]);

    const manifest = buildManifest({ body: bodySnapshot, drawings, commentsState });

    // Serialize everything (simulating .paperlike zip contents)
    const serializedManifest = serializeManifest(manifest);
    const serializedBody = serializeBody(bodySnapshot);
    const serializedScene = serializeDrawingScene(scene);
    const serializedHistory = serializeDrawingHistory(actions);
    const serializedHistoryState = serializeHistoryState(historyState);

    // === IMPORT BUNDLE (simulate loading from file) ===

    const importedManifest = deserializeManifest(serializedManifest);
    const importedBody = deserializeBody(serializedBody);
    const importedScene = deserializeDrawingScene(serializedScene);
    const importedHistory = deserializeDrawingHistory(serializedHistory);
    const importedHistoryState = deserializeHistoryState(serializedHistoryState);

    // Restore comments
    const importedCommentsDoc = createCommentsDoc();
    applyUpdate(importedCommentsDoc, commentsState);

    // === VERIFY STATE CONTINUITY ===

    // Manifest
    expect(importedManifest.version).toBe("1.0");
    expect(importedManifest.docId).toBe(docId);
    expect(importedManifest.drawingIds).toEqual([drawingId]);

    // Body
    expect(importedBody.docId).toBe(docId);
    expect(importedBody.version).toBe(2);
    expect(importedBody.blocks).toHaveLength(2);
    expect((importedBody.blocks[0] as ParagraphBlock).text).toBe("Hello, Paperlike!");
    expect((importedBody.blocks[1] as DrawingRefBlock).drawingId).toBe(drawingId);

    // Drawing scene
    expect(importedScene.drawingId).toBe(drawingId);
    expect(importedScene.elements).toHaveLength(1);
    expect(importedScene.elements[0]?.type).toBe("rectangle");
    expect(importedScene.appState.viewBackgroundColor).toBe("#ffffff");

    // Drawing history (undo/redo persists across import)
    expect(importedHistory).toHaveLength(1);
    expect(canUndo(importedHistoryState)).toBe(true);

    let undoneScene = applyUndo(importedScene, importedHistory, importedHistoryState);
    expect(undoneScene.elements).toHaveLength(0);

    // Comments
    const importedComments = getComments(importedCommentsDoc);
    expect(importedComments).toHaveLength(1);
    expect(importedComments[0]?.text).toBe("Looks great!");
  });

  test("empty document bundle round-trip", () => {
    const docId = createDocId("doc-empty");
    const bodySnapshot: DocumentSnapshot = { docId, version: 0, blocks: [] };
    const drawings = new Map();

    const manifest = buildManifest({ body: bodySnapshot, drawings, commentsState: null });

    const serialized = serializeManifest(manifest);
    const imported = deserializeManifest(serialized);

    expect(imported.docId).toBe(docId);
    expect(imported.drawingIds).toEqual([]);

    const bodyJson = serializeBody(bodySnapshot);
    const importedBody = deserializeBody(bodyJson);
    expect(importedBody.blocks).toEqual([]);
  });

  test("multiple drawings in a single bundle", () => {
    const docId = createDocId("doc-multi");
    const drawingId1 = createDrawingId("d1");
    const drawingId2 = createDrawingId("d2");

    const scene1: DrawingScene = {
      drawingId: drawingId1,
      elements: [{ id: createElementId("e1"), type: "rect", x: 0, y: 0, width: 10, height: 10 }],
      appState: {},
      files: {},
    };
    const scene2: DrawingScene = {
      drawingId: drawingId2,
      elements: [
        { id: createElementId("e2"), type: "circle", x: 5, y: 5, width: 20, height: 20 },
      ],
      appState: {},
      files: {},
    };

    // Serialize both scenes
    const json1 = serializeDrawingScene(scene1);
    const json2 = serializeDrawingScene(scene2);

    const restored1 = deserializeDrawingScene(json1);
    const restored2 = deserializeDrawingScene(json2);

    expect(restored1.drawingId).toBe(drawingId1);
    expect(restored2.drawingId).toBe(drawingId2);
    expect(restored1.elements[0]?.type).toBe("rect");
    expect(restored2.elements[0]?.type).toBe("circle");
  });

  test("drawing history JSONL round-trip preserves action details", () => {
    const actions: DrawingAction[] = [
      {
        drawingId: createDrawingId("d1"),
        historyGroupId: createHistoryGroupId("hg-1"),
        forward: [
          {
            type: "add_element",
            element: { id: createElementId("e1"), type: "rect", x: 0, y: 0, width: 10, height: 10 },
          },
        ],
        inverse: [{ type: "delete_element", elementId: createElementId("e1") }],
        timestamp: 100,
      },
      {
        drawingId: createDrawingId("d1"),
        historyGroupId: createHistoryGroupId("hg-2"),
        forward: [
          { type: "update_element", elementId: createElementId("e1"), patch: { x: 50 } },
        ],
        inverse: [
          { type: "update_element", elementId: createElementId("e1"), patch: { x: 0 } },
        ],
        timestamp: 200,
      },
    ];

    const jsonl = serializeDrawingHistory(actions);
    const lines = jsonl.trim().split("\n");
    expect(lines).toHaveLength(2);

    const restored = deserializeDrawingHistory(jsonl);
    expect(restored).toHaveLength(2);
    expect(restored[0]?.historyGroupId).toBe("hg-1");
    expect(restored[1]?.historyGroupId).toBe("hg-2");
    expect(restored[0]?.forward[0]?.type).toBe("add_element");
    expect(restored[1]?.forward[0]?.type).toBe("update_element");
  });
});
