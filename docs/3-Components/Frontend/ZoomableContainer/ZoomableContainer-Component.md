# 🧩 Компонент: ZoomableContainer

## Описание
Обеспечивает интерактивный вьюпорт с поддержкой линейного зума к точке курсора и панорамирования.

## Техническая реализация
Использует `ResizeObserver` для отслеживания размеров контейнера и математические формулы для расчета смещения контента при масштабировании.

## Зависимости
- **Upstream**: [[3-Components/Frontend/ArtifactPanel/ArtifactPanel-Component|Компонент: ArtifactPanel]]
- **Downstream (Логика)**: [[4-Code/Frontend/ZoomableContainer/Zoom-Math|Код: Математика зума]]
- **Related**: [[3-Components/Frontend/BananaRenderer/BananaRenderer-Component|Компонент: BananaRenderer]] (используется внутри контейнера)
