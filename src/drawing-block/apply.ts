// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import type {
  DrawingElement,
  DrawingAppState,
  DrawingFiles,
  DrawingScene,
} from "./types.js";
import type { DrawingPatch } from "./actions.js";

/** Apply a single patch to an elements array */
export const applyElementPatch = (
  elements: readonly DrawingElement[],
  patch: DrawingPatch,
): readonly DrawingElement[] => {
  switch (patch.type) {
    case "add_element":
      return [...elements, patch.element];
    case "update_element":
      return elements.map((el) =>
        el.id === patch.elementId ? ({ ...el, ...patch.patch, id: el.id } as DrawingElement) : el,
      );
    case "delete_element":
      return elements.filter((el) => el.id !== patch.elementId);
    default:
      return elements;
  }
};

/** Apply a single patch to app state */
export const applyAppStatePatch = (
  appState: DrawingAppState,
  patch: DrawingPatch,
): DrawingAppState => {
  if (patch.type === "set_app_state") {
    return { ...appState, ...patch.patch };
  }
  return appState;
};

/** Apply a single patch to files */
export const applyFilesPatch = (files: DrawingFiles, patch: DrawingPatch): DrawingFiles => {
  if (patch.type === "upsert_files") {
    return { ...files, ...patch.files };
  }
  return files;
};

/** Apply a list of patches to a drawing scene */
export const applyPatches = (scene: DrawingScene, patches: readonly DrawingPatch[]): DrawingScene =>
  patches.reduce<DrawingScene>(
    (acc, patch) => ({
      drawingId: acc.drawingId,
      elements: applyElementPatch(acc.elements, patch),
      appState: applyAppStatePatch(acc.appState, patch),
      files: applyFilesPatch(acc.files, patch),
    }),
    scene,
  );
