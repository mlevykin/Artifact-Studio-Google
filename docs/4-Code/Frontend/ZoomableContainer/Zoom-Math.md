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
- **Upstream**: [[3-Components/Frontend/ZoomableContainer/ZoomableContainer-Component|Компонент: ZoomableContainer]]
- **Index**: [[Index|Вернуться к оглавлению]]
