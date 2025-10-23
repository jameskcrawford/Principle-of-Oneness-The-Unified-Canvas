import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Path, Point } from './types';
import { COLORS, SOURCE_RADIUS, SOURCE_ID } from './constants';

const generatePathData = (points: Point[], center: Point): string => {
  if (points.length < 2) {
    return "";
  }
  const absolutePoints = points.map(p => ({ x: p.x + center.x, y: p.y + center.y }));
  const firstPoint = absolutePoints[0];
  const remainingPoints = absolutePoints.slice(1);
  return `M ${firstPoint.x} ${firstPoint.y} ${remainingPoints.map(p => `L ${p.x} ${p.y}`).join(' ')}`;
};

const App: React.FC = () => {
  const [paths, setPaths] = useState<Path[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingAllowed, setIsDrawingAllowed] = useState(false);
  const [currentColorIndex, setCurrentColorIndex] = useState(3);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const svgRef = useRef<SVGSVGElement>(null);
  const pathIdCounter = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCoordinates = useCallback((event: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in event) {
      if (event.touches.length === 0) return null;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handleDrawStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if ((event.target as SVGElement).id !== SOURCE_ID) {
      return;
    }
    
    event.preventDefault();
    setIsDrawingAllowed(true);
    setIsDrawing(true);

    const absolutePoint = getCoordinates(event);
    if (!absolutePoint) return;
    
    const center = { x: windowSize.width / 2, y: windowSize.height / 2 };

    const dx = absolutePoint.x - center.x;
    const dy = absolutePoint.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // The point on the circumference of the orb, relative to the center
    let startPoint; 
    if (distance === 0) {
      startPoint = { x: 0, y: -SOURCE_RADIUS };
    } else {
      startPoint = {
        x: (dx / distance) * SOURCE_RADIUS,
        y: (dy / distance) * SOURCE_RADIUS,
      };
    }

    // The current cursor position, relative to the center
    const currentRelativePoint = {
      x: absolutePoint.x - center.x,
      y: absolutePoint.y - center.y
    };

    setPaths(prevPaths => [
      ...prevPaths,
      { 
        id: pathIdCounter.current++, 
        points: [startPoint, currentRelativePoint],
        colorIndex: currentColorIndex 
      }
    ]);
  }, [getCoordinates, windowSize.width, windowSize.height, currentColorIndex]);

  const handleDrawMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawingAllowed) return;
    
    event.preventDefault();
    const absolutePoint = getCoordinates(event);
    if (!absolutePoint) return;
    
    const center = { x: windowSize.width / 2, y: windowSize.height / 2 };
    const relativePoint = {
      x: absolutePoint.x - center.x,
      y: absolutePoint.y - center.y
    };

    setPaths(prevPaths => {
      const newPaths = [...prevPaths];
      const currentPath = newPaths[newPaths.length - 1];
      if (currentPath) {
        currentPath.points.push(relativePoint);
      }
      return newPaths;
    });
  }, [isDrawing, isDrawingAllowed, getCoordinates, windowSize.width, windowSize.height]);

  const handleDrawEnd = useCallback(() => {
    setIsDrawing(false);
    setIsDrawingAllowed(false);
  }, []);

  const handleClear = () => {
    setPaths([]);
    setCurrentColorIndex(3); // Reset to default color
  };

  const center = { x: windowSize.width / 2, y: windowSize.height / 2 };
  const currentColor = COLORS[currentColorIndex].hex;

  return (
    <div className="w-screen h-screen bg-gray-900 text-white select-none relative overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full absolute top-0 left-0"
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
        onMouseLeave={handleDrawEnd}
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Drawn Extensions */}
        {paths.map(path => {
          const pathColor = COLORS[path.colorIndex].hex;
          return (
            <path
              key={path.id}
              d={generatePathData(path.points, center)}
              stroke={pathColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="pulse-glow"
              style={{ color: pathColor }}
            />
          );
        })}

        {/* Central Source */}
        <circle
          id={SOURCE_ID}
          cx={center.x}
          cy={center.y}
          r={SOURCE_RADIUS}
          fill={currentColor}
          className="cursor-pointer pulse-glow"
          style={{ color: currentColor }}
        />
      </svg>
      
      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-10">
        <div className="flex items-center justify-center gap-2 bg-gray-800/50 backdrop-blur-sm p-2 rounded-full">
          {COLORS.map((color, index) => (
            <button
              key={color.name}
              title={color.name}
              onClick={() => setCurrentColorIndex(index)}
              className={`w-8 h-8 rounded-full transition-transform duration-200 ease-in-out border-2 ${index === currentColorIndex ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
      </div>
      
      <button
        onClick={handleClear}
        className="absolute top-4 right-4 bg-gray-800/50 backdrop-blur-sm text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700/70 transition-colors z-10"
      >
        Clear All
      </button>
    </div>
  );
};

export default App;
