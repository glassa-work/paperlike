# Architecture

> **Maintainer note:** This document must be updated whenever the module structure, dependency graph, or design patterns change. Every code file contains a reminder comment for this.

## Overview

Paperlike is a collaborative document editor library built as a set of modular, loosely-coupled TypeScript packages. The library follows SOLID principles with dependency injection, branded types for compile-time safety, and immutable data structures throughout.

## Module Dependency Graph

```
src/index.ts (main barrel export)
  |
  +-- types/            Core branded IDs, block types, document snapshot
  |     |
  |     +-- ids.ts      Non-drawing IDs (DocId, BlockId, etc.)
  |     |               Re-exports DrawingId, ElementId, HistoryGroupId from drawing-block
  |     +-- blocks.ts   Block discriminated union types
  |     +-- document.ts DocumentSnapshot interface
  |     +-- drawing.ts  Re-exports DrawingElement, DrawingScene, etc. from drawing-block
  |
  +-- body/             Document body operations
  |     +-- ops.ts      BodyOp discriminated union (insert, update, delete, move, etc.)
  |     +-- apply.ts    Pure functions to apply BodyOps to block arrays
  |     +-- lease.ts    Single-writer lease validation predicates
  |
  +-- drawing-block/    SELF-CONTAINED drawing module (zero external deps)
  |     +-- types.ts    DrawingElement, DrawingScene, branded IDs (canonical source)
  |     +-- actions.ts  DrawingPatch & DrawingAction types
  |     +-- apply.ts    Pure patch application functions
  |     +-- history.ts  Undo/redo history state (functional)
  |     +-- engine.ts   DrawingEngine interface (DIP)
  |     +-- default-engine.ts  Reference in-memory implementation
  |     +-- action-recorder.ts Action log + undo/redo cursor (SRP)
  |     +-- emitter.ts  Generic typed event emitter (SRP)
  |     +-- controller.ts Slim orchestrator (delegates to engine + recorder + emitter)
  |
  +-- drawing/          Re-exports from drawing-block (backward compatibility shim)
  |
  +-- comments/         CRDT-based comments
  |     +-- types.ts    Comment, CommentAnchor, CommentStreamEvent
  |     +-- crdt.ts     Yjs wrapper functions
  |
  +-- adapter/          Host integration interfaces
  |     +-- interface.ts SnapshotAdapter, StreamAdapter, LeaseAdapter, PaperlikeAdapter
  |
  +-- export/           Bundle serialization
        +-- manifest.ts PaperlikeManifest interface
        +-- bundle.ts   Serialize/deserialize functions (JSON + JSONL)
```

## Key Design Decisions

### drawing-block is self-contained

The `drawing-block/` module has **zero imports from other `src/` modules**. It defines its own branded types (`DrawingId`, `ElementId`, `HistoryGroupId`), its own `Brand<T, B>` utility, and all drawing-related logic. This means:

1. It can be extracted into a separate npm package with no code changes
2. The `DrawingEngine` interface allows swapping in any canvas library (Excalidraw, tldraw, Canvas2D, etc.)
3. The rest of paperlike consumes drawing-block through re-exports in `types/drawing.ts`, `types/ids.ts`, and `drawing/`

### Controller decomposition (SRP)

The `DrawingBlockController` was decomposed into three single-responsibility classes:

| Class | Responsibility | Lines |
|-------|---------------|-------|
| `ActionRecorder` | Owns the action log and undo/redo cursor | ~85 |
| `Emitter<T>` | Generic typed event subscription | ~17 |
| `DrawingBlockController` | Slim orchestrator that coordinates engine + recorder + emitter | ~130 |

### Branded types for compile-time safety

All IDs use branded types (`Brand<string, "DocId">`) so you can't accidentally pass a `DocId` where a `BlockId` is expected. The drawing-block module defines its own `Brand` utility to stay self-contained.

### Immutable data flow

- All types use `readonly` properties
- Patch application functions are pure (no mutations)
- Engine snapshots return frozen copies
- History state transitions return new objects

### Adapter pattern (ISP)

The host adapter is split into three focused interfaces:

- `SnapshotAdapter` - load/save snapshots and history state (8 methods)
- `StreamAdapter` - pub/sub for operations and events (6 methods)
- `LeaseAdapter` - single-writer lease management (4 methods)
- `PaperlikeAdapter` - composite interface combining all three

### Discriminated unions for type safety

- `Block` = paragraph | heading | list | drawing_ref | section | spacer
- `BodyOp` = insert_block | update_block | delete_block | move_block | split_section | set_section_layout
- `DrawingPatch` = add_element | update_element | delete_element | set_app_state | upsert_files
- `CommentAnchor` = block | drawing | element

## Testing Strategy

- **Unit tests** (vitest): 9 test files covering all modules, 109 tests total
- **E2E tests** (playwright): 4 spec files, 15 tests covering full lifecycles
- Tests live alongside source files (`*.test.ts` next to `*.ts`)

## Swapping the Drawing Engine

To use Excalidraw (or any other canvas library) instead of the default in-memory engine:

1. Implement the `DrawingEngine` interface from `drawing-block/engine.ts`
2. Pass your implementation to `DrawingBlockController` via the `engine` config option
3. The controller, action recorder, history, and patch logic all work unchanged

```typescript
import type { DrawingEngine } from "@paperlike/editor";

class ExcalidrawEngine implements DrawingEngine {
  // Wrap Excalidraw's API to match the interface
  getSnapshot() { /* ... */ }
  loadSnapshot(snapshot) { /* ... */ }
  addElement(element) { /* ... */ }
  // ... etc
}

const controller = new DrawingBlockController({
  drawingId: createDrawingId("d1"),
  engine: new ExcalidrawEngine(),
  createHistoryGroupId: () => createHistoryGroupId(crypto.randomUUID()),
});
```
