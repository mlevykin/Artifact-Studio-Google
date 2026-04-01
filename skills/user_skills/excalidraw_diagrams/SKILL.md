---
name: Excalidraw Diagrams
description: Guidelines for creating hand-drawn style diagrams using a custom text-based DSL within excalidraw code blocks. Use this for architectural schemas, flowcharts, and diagrams that require a sketchy, hand-drawn aesthetic.
---

# Excalidraw Diagram DSL (NATIVE SUPPORT ENABLED)

**NOTE:** This environment has a custom renderer for `excalidraw` code blocks. You can use `excalidraw` for hand-drawn, sketchy, or whiteboard-style diagrams. For formal diagrams, you may still use `mermaid`.

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

### 3. Layout Direction (Optional)
You can specify the layout direction at the top of the file:
- `direction: LR` -> **Left to Right** (Horizontal)
- `direction: TB` -> **Top to Bottom** (Vertical, default)
- `direction: RL` -> **Right to Left**
- `direction: BT` -> **Bottom to Top**

### 4. Styling (Optional)
You can add styling attributes in curly braces `{}` at the end of any line. Attributes are comma-separated `key: value` pairs.

**Supported Attributes:**
- `stroke`: Color of the border/line (e.g., `#4f46e5`, `red`)
- `fill`: Background color
- `fillStyle`: Type of hatching (`hachure` (default), `solid`, `zigzag`, `cross-hatch`, `dots`)
- `roughness`: Sketchiness level (0 to 5, default 1.5)
- `strokeWidth`: Thickness of the line (default 1.5)
- `opacity`: Transparency (0.0 to 1.0)
- `icon`: Name of a Lucide icon (e.g., `user`, `database`, `server`, `shield`, `lock`, `cloud`, `mail`, `settings`)

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

### Horizontal Diagram (Left-to-Right)
```excalidraw
direction: LR
User [Пользователь] { icon: user }
API [API Gateway] { icon: shield }
Service [Backend] { icon: server }

User -> API : Request
API -> Service : Process
```

## Best Practices
- Keep IDs short and alphanumeric (e.g., `User`, `AuthSvc`, `db1`).
- Use labels for human-readable text.
- The layout engine (dagre) automatically positions nodes, so you don't need to specify coordinates.
