# paperlike

A collaborative block-based document editor with Excalidraw-powered drawing blocks.

**[Live Demo](https://glassa-work.github.io/paperlike/)**

## Features

- **Block-based editing** — paragraph, heading, list, and drawing blocks with a clean, focused writing experience
- **Excalidraw drawings** — full-featured drawing blocks powered by [Excalidraw](https://excalidraw.com/) with freehand drawing, shapes, text, and more
- **Drawing controls** — fullscreen mode, resizable height, toolbar toggle, and auto-centering in view mode
- **Contextual toolbar** — formatting options (bold, italic, code, links) appear on text selection
- **Slash commands** — type `/` to insert new block types
- **Drag-and-drop reordering** — rearrange blocks by dragging
- **Export/import** — full document serialization as JSON

## Demo

The demo is deployed to GitHub Pages and available at:

https://glassa-work.github.io/paperlike/

To run locally:

```bash
npx serve demo -p 3000
```

## Development

```bash
npm run test:e2e       # Run e2e tests with Playwright
```

## Tech Stack

- Vanilla JS/HTML/CSS (no build step for the demo)
- [Excalidraw](https://excalidraw.com/) via esm.sh CDN for drawing blocks
- React/ReactDOM (loaded via import maps for Excalidraw)
- [Playwright](https://playwright.dev/) for e2e testing

## License

ISC
