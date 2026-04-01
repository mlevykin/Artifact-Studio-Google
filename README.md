# AI Artifact Studio

This is a specialized environment for generating and rendering various artifacts.

## Supported Diagram Engines

### 1. Excalidraw (Preferred for Sketchy/Hand-drawn style)
- **Identifier:** ` ```excalidraw `
- **Rendering:** Fully supported via a custom engine (Rough.js + Dagre).
- **Usage:** Use this when the user asks for "Excalidraw", "hand-drawn", "sketchy", or "whiteboard" style.
- **Syntax:** See `/skills/user_skills/excalidraw_diagrams/SKILL.md` for full DSL documentation.

### 2. Mermaid
- **Identifier:** ` ```mermaid `
- **Usage:** Use for standard, formal diagrams (Gantt, Sequence, Flowchart) when a hand-drawn style is NOT requested.

## Environment Constraints
- All code blocks are rendered in real-time.
- The `excalidraw` engine is NATIVE to this app. Do not assume it is missing.
