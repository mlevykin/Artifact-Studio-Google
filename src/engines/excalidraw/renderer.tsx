import React, { useEffect, useRef, useState } from 'react';
import rough from 'roughjs';
import { Graph, Node, Edge } from './types';

interface ExcalidrawRendererProps {
  graph: Graph;
}

export const ExcalidrawRenderer: React.FC<ExcalidrawRendererProps> = ({ graph }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState('0 0 800 600');

  useEffect(() => {
    if (!svgRef.current) return;

    const rc = rough.svg(svgRef.current);
    const svg = svgRef.current;
    
    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Draw nodes
    for (const node of graph.nodes) {
      const { x = 0, y = 0, width = 100, height = 50, label, type, style = {} } = node;
      const left = x - width / 2;
      const top = y - height / 2;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + width);
      maxY = Math.max(maxY, top + height);

      const options = {
        roughness: style.roughness ?? 1.5,
        stroke: style.stroke ?? '#3f3f46',
        strokeWidth: style.strokeWidth ?? 1.5,
        fill: style.fill,
        fillStyle: style.fillStyle ?? 'hachure',
        fillWeight: 1.5,
        hachureAngle: 60,
        hachureGap: 4,
        opacity: style.opacity ?? 1
      };

      let shape;
      if (type === 'diamond') {
        shape = rc.polygon([
          [x, top],
          [left + width, y],
          [x, top + height],
          [left, y]
        ], options);
      } else if (type === 'ellipse') {
        shape = rc.ellipse(x, y, width, height, options);
      } else {
        shape = rc.rectangle(left, top, width, height, options);
      }
      svg.appendChild(shape);

      // Add text with better centering
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x.toString());
      text.setAttribute('y', (y + 4).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-family', '"Inter", sans-serif');
      text.setAttribute('font-size', '14px');
      text.setAttribute('font-weight', '500');
      text.setAttribute('fill', style.stroke ?? '#18181b');
      text.textContent = label;
      svg.appendChild(text);
    }

    // Draw edges
    for (const edge of graph.edges) {
      const points = edge.points || [];
      if (points.length < 2) continue;

      const style = edge.style || {};
      const options = {
        roughness: style.roughness ?? 1.2,
        stroke: style.stroke ?? '#71717a',
        strokeWidth: style.strokeWidth ?? 1.2,
        strokeLineDash: style.strokeLineDash
      };

      const pathPoints: [number, number][] = points.map(p => [p.x, p.y]);
      const shape = rc.curve(pathPoints, options);
      svg.appendChild(shape);

      // Draw arrow head
      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const arrowSize = 10;
      const arrowPoints: [number, number][] = [
        [last.x - arrowSize * Math.cos(angle - Math.PI / 6), last.y - arrowSize * Math.sin(angle - Math.PI / 6)],
        [last.x, last.y],
        [last.x - arrowSize * Math.cos(angle + Math.PI / 6), last.y - arrowSize * Math.sin(angle + Math.PI / 6)]
      ];
      const arrow = rc.linearPath(arrowPoints, options);
      svg.appendChild(arrow);

      // Edge label
      if (edge.label) {
        const midIdx = Math.floor(points.length / 2);
        const mid = points[midIdx];
        
        // Add a small white background rectangle for the label
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const labelWidth = edge.label.length * 8 + 10;
        const labelHeight = 20;
        bg.setAttribute('x', (mid.x - labelWidth / 2).toString());
        bg.setAttribute('y', (mid.y - labelHeight / 2 - 5).toString());
        bg.setAttribute('width', labelWidth.toString());
        bg.setAttribute('height', labelHeight.toString());
        bg.setAttribute('fill', 'white');
        bg.setAttribute('opacity', '0.9');
        bg.setAttribute('rx', '4');
        svg.appendChild(bg);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', mid.x.toString());
        text.setAttribute('y', (mid.y - 5).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-family', '"Inter", sans-serif');
        text.setAttribute('font-size', '12px');
        text.setAttribute('font-weight', '500');
        text.setAttribute('fill', '#71717a');
        text.textContent = edge.label;
        svg.appendChild(text);
      }
    }

    // Update viewBox
    if (minX !== Infinity) {
      const padding = 40;
      setViewBox(`${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`);
    }

  }, [graph]);

  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-white rounded-xl border border-zinc-200 p-4 overflow-hidden">
      <svg ref={svgRef} viewBox={viewBox} className="w-full h-full max-w-full max-h-full" preserveAspectRatio="xMidYMid meet" />
    </div>
  );
};
