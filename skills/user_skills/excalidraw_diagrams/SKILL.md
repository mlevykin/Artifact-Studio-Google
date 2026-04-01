---
name: Excalidraw Diagrams
description: Guidelines for creating hand-drawn style diagrams using a custom text-based DSL within excalidraw code blocks. Use this for architectural schemas, flowcharts, and diagrams that require a sketchy, hand-drawn aesthetic.
---

# Excalidraw Diagram DSL

Use the `excalidraw` language identifier in Markdown code blocks to render hand-drawn style diagrams.

## Syntax

### 1. Node Definitions
Nodes are defined by an ID followed by a label in specific brackets that determine the shape:
- `ID [Label]` -> **Rectangle** (Process/Step)
- `ID {Label}` -> **Diamond** (Decision)
- `ID (Label)` -> **Ellipse** (Start/End/Database)

### 2. Edge Definitions
Edges define connections between nodes:
- `ID1 -> ID2` -> Simple arrow
- `ID1 -> ID2 : Label` -> Arrow with a text label

### 3. Styling (Optional)
You can add styling attributes in curly braces `{}` at the end of any line. Attributes are comma-separated `key: value` pairs.

**Supported Attributes:**
- `stroke`: Color of the border/line (e.g., `#4f46e5`, `red`)
- `fill`: Background color
- `fillStyle`: Type of hatching (`hachure` (default), `solid`, `zigzag`, `cross-hatch`, `dots`)
- `roughness`: Sketchiness level (0 to 5, default 1.5)
- `strokeWidth`: Thickness of the line (default 1.5)
- `opacity`: Transparency (0.0 to 1.0)

## Examples

### Basic Flowchart
```excalidraw
Start (Start)
Check {Is Valid?}
Process [Process Data]
End (End)

Start -> Check
Check -> Process : Yes
Check -> End : No
Process -> End
```

### Styled Architecture
```excalidraw
Client [User Browser] { stroke: #2563eb, fill: #dbeafe }
API [Gateway] { stroke: #4f46e5, fill: #e0e7ff, fillStyle: solid }
DB (PostgreSQL) { stroke: #dc2626, fill: #fee2e2, fillStyle: cross-hatch, roughness: 2 }

Client -> API : HTTPS Request { strokeWidth: 2 }
API -> DB : SQL Query { roughness: 0.5 }
```

## Best Practices
- Keep IDs short and alphanumeric (e.g., `User`, `AuthSvc`, `db1`).
- Use labels for human-readable text.
- Prefer `excalidraw` over `mermaid` when the user asks for "Excalidraw style", "hand-drawn", or "sketchy" diagrams.
- The layout engine (dagre) automatically positions nodes, so you don't need to specify coordinates.
