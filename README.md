# @paperlike/editor

A collaborative document editor library with support for text blocks, drawings, and comments.

> **Maintainer note:** When related code changes, `README.md`, `ARCHITECTURE.md`, and all inline doc-update comments must be reviewed and updated to stay in sync.

## Features

- **Block-based document body** with paragraph, heading, list, drawing reference, section, and spacer blocks
- **Drawing block** (self-contained module) with element CRUD, undo/redo history, and pluggable engine interface (swap in Excalidraw, tldraw, or any canvas lib)
- **CRDT-based comments** using Yjs for conflict-free multi-author editing
- **Adapter pattern** for host integration (snapshot persistence, pub/sub streams, lease management)
- **Export/import** bundles for full document round-trips

## Quick Start

```bash
npm install @paperlike/editor
```

```typescript
import {
  DrawingBlockController,
  DefaultDrawingEngine,
  createDrawingId,
  createElementId,
  createHistoryGroupId,
} from "@paperlike/editor";

const controller = new DrawingBlockController({
  drawingId: createDrawingId("d1"),
  engine: new DefaultDrawingEngine(),
  createHistoryGroupId: () => createHistoryGroupId(crypto.randomUUID()),
});

controller.addElement({
  id: createElementId("rect-1"),
  type: "rectangle",
  x: 10, y: 20,
  width: 100, height: 50,
});

controller.undo();  // removes the rectangle
controller.redo();  // adds it back
```

## Project Structure

```
src/
  types/           Branded IDs, block types, document snapshot
  body/            Document body operations & lease management
  drawing-block/   Self-contained drawing module (can be extracted as its own package)
    types.ts       Drawing types & branded IDs (DrawingId, ElementId, etc.)
    actions.ts     Patch operation definitions
    apply.ts       Pure patch application functions
    history.ts     Undo/redo history state management
    engine.ts      DrawingEngine interface (plug in Excalidraw, tldraw, etc.)
    default-engine.ts  Reference in-memory engine implementation
    action-recorder.ts Action log & undo/redo cursor management
    emitter.ts     Generic typed event emitter
    controller.ts  Slim orchestrator coordinating engine + recorder
  comments/        CRDT-based comments using Yjs
  adapter/         Host adapter interfaces (snapshot, stream, lease)
  export/          Bundle serialization/deserialization
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design documentation.

## Drawing Block as Standalone

The `drawing-block/` module is fully self-contained with zero imports from other `src/` modules. It owns its own types, branded IDs, patch logic, history, engine interface, and controller. This means:

- It can be extracted into its own npm package with no changes
- You can swap the drawing engine (e.g., plug in Excalidraw or tldraw) by implementing the `DrawingEngine` interface
- The rest of paperlike consumes it through re-exports, so the public API stays the same

## Scripts

```bash
npm run build          # Build with tsup (ESM + CJS + types)
npm run typecheck      # Type check with tsc
npm run test           # Run unit tests with vitest
npm run test:e2e       # Run e2e tests with playwright
npm run lint           # Lint with eslint
npm run format         # Check formatting with prettier
npm run format:fix     # Fix formatting
```

## Architecture

The library follows SOLID principles:

- **SRP**: Each class/module has a single responsibility (ActionRecorder tracks actions, Emitter handles events, Controller orchestrates)
- **OCP**: DrawingEngine interface is open for extension (new engines) without modifying existing code
- **LSP**: Any DrawingEngine implementation can substitute DefaultDrawingEngine
- **ISP**: Adapter split into SnapshotAdapter, StreamAdapter, LeaseAdapter
- **DIP**: Controller depends on DrawingEngine interface, not concrete implementations

## License

ISC
