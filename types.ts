export interface Point {
  x: number;
  y: number;
}

export interface Path {
  id: number;
  points: Point[];
  colorIndex: number;
}

export interface Star {
  cx: number;
  cy: number;
  r: number;
  animationDuration: string;
  animationDelay: string;
}