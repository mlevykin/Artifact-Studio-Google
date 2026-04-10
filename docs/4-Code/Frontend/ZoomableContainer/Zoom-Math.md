# 💻 Код: Математика зума

## Алгоритм "Zoom to Point"
Для обеспечения стабильности точки под курсором при масштабировании используются следующие формулы:

1.  **Относительные координаты на документе**:
    `relX = (mouseX - position.x) / zoom`
    `relY = (mouseY - position.y) / zoom`

2.  **Новая позиция после изменения зума**:
    `newX = mouseX - relX * newZoom`
    `newY = mouseY - relY * newZoom`

## Навигация
- **Upstream**: [[ZoomableContainer-Component|Компонент: ZoomableContainer]]
