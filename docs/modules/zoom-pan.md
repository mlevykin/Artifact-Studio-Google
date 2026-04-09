# Zoom and Pan Specification (4C Model)

This document describes the implementation of the linear "Zoom to Point" and "Pan" logic used in the `ZoomableContainer` component.

## 1. Context (C1)
The `ZoomableContainer` provides a viewport for interacting with large documents (Markdown) or diagrams. It allows users to inspect details via zooming and navigate through content via panning, ensuring that the point of interest (under the mouse cursor) remains stable during scaling.

## 2. Containers (C2)
- **Viewport (ContainerRef)**: An `overflow: hidden` div that defines the visible area.
- **Canvas (Positioned Div)**: An absolute-positioned div that holds the content. It is transformed using `translate(x, y)` and `scale(z)`.
- **Content (ContentRef)**: The actual rendered component (Markdown or Diagram).

## 3. Components (C3)
- **State Manager**: Tracks `zoom` (number) and `position` ({x, y}).
- **Input Handlers**:
    - `onWheel`: Detects zoom intent (Ctrl + Scroll) or scroll intent.
    - `onMouseDown/Move/Up`: Handles panning logic.
- **Transformation Engine**: Applies CSS transforms based on state.

## 4. Code (C4)

### Mathematical Foundation

The core logic uses a **Linear Zoom-to-Point** algorithm. The transformation origin is fixed at the top-left corner `(0, 0)` of the content to ensure mathematical simplicity and predictability.

#### A. Coordinate Systems
1. **Screen/Container Coordinates `(mouseX, mouseY)`**: The pixel position of the mouse relative to the top-left corner of the viewport.
2. **Document/Unscaled Coordinates `(relX, relY)`**: The position on the document as if it were at `zoom = 1` and `position = (0,0)`.

#### B. Zoom Formula
When a zoom event occurs at a focal point `(mouseX, mouseY)`:

1. **Calculate the relative point on the document**:
   $$relX = \frac{mouseX - currentPosition.x}{currentZoom}$$
   $$relY = \frac{mouseY - currentPosition.y}{currentZoom}$$

2. **Calculate the new position to keep the relative point under the mouse**:
   $$nextPosition.x = mouseX - relX \times nextZoom$$
   $$nextPosition.y = mouseY - relY \times nextZoom$$

### Implementation Details

```typescript
const handleZoom = (newZoom, focalPoint) => {
  const mouseX = focalPoint.x;
  const mouseY = focalPoint.y;

  // 1. Determine where on the document the mouse is (unscaled)
  const relX = (mouseX - position.x) / zoom;
  const relY = (mouseY - position.y) / zoom;

  // 2. Calculate new position to keep that point under the mouse
  const nextX = mouseX - relX * newZoom;
  const nextY = mouseY - relY * newZoom;

  setZoom(newZoom);
  setPosition({ x: nextX, y: nextY });
};
```

### Panning Logic
Panning is a simple linear translation of the `position` state:
$$nextPosition.x = currentPosition.x + deltaX$$
$$nextPosition.y = currentPosition.y + deltaY$$

### Initial Alignment
To center the document initially or on "Fit to Screen":
$$initialX = \frac{containerWidth - contentWidth \times zoom}{2}$$
$$initialY = \text{offset (e.g., 64px for header)}$$
