# Banana JSON Specification (Semantic Diagram Contract)

This document defines the `banana-json` artifact type, designed for high-fidelity, aesthetic diagrams that follow the "Paper Banana" design language.

## 1. Purpose
Unlike Mermaid or Excalidraw, `banana-json` separates data from presentation. The LLM provides the semantic structure (nodes and edges), and the application's `BananaRenderer` handles the visual styling, ensuring consistency, high-quality typography, and smooth animations.

## 2. Schema

```json
{
  "title": "String (Optional)",
  "description": "String (Optional)",
  "nodes": [
    {
      "id": "String (Unique)",
      "label": "String (Display Text)",
      "type": "process" | "decision" | "start" | "end"
    }
  ],
  "edges": [
    {
      "from": "String (Node ID)",
      "to": "String (Node ID)",
      "label": "String (Optional)"
    }
  ]
}
```

## 3. Aesthetic Rules (The Contract)
The renderer enforces the following styles:

- **Nodes**:
    - `process`: Soft blue fill (`#f0f4ff`), dark blue border (`#4a6fa5`), 8px rounded corners.
    - `decision`: Soft yellow fill (`#fff8e1`), gold border (`#c9a227`), diamond shape.
    - `start`/`end`: Soft green fill (`#f0fdf4`), dark green border (`#166534`), capsule shape.
- **Typography**: `system-ui, sans-serif`, 13px, dark navy text (`#1a1a2e`).
- **Edges**: 1.5px solid lines (`#555555`) with clean arrowheads.
- **Layout**: Automatic top-to-bottom layout using `dagre`.

## 4. Usage Guidelines
- Use `banana-json` when the user requests a "professional", "academic", or "polished" diagram.
- Prefer `banana-json` over Mermaid for simple to medium complexity flowcharts where visual quality is a priority.
