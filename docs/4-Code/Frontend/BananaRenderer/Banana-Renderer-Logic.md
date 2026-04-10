# 💻 Код: Логика рендеринга Banana JSON

## Процесс обработки
1.  **Парсинг**: Валидация JSON-структуры (nodes, edges).
2.  **Раскладка (Layout)**: Использование `dagre.graphlib` для расчета координат `x, y` каждого узла и точек изгиба связей.
3.  **Отрисовка**: Генерация SVG-элементов с применением стилей "Paper Banana" (pastel fills, dark borders).
4.  **Анимация**: Использование `motion.g` и `motion.path` для плавного появления графа.

## Навигация
- **Upstream**: [[3-Components/Frontend/BananaRenderer/BananaRenderer-Component|Компонент: BananaRenderer]]
- **Index**: [[Index|Вернуться к оглавлению]]
