export interface Point {
  x: number;
  y: number;
}

export interface Path {
  id: number;
  points: Point[];
  colorIndex: number;
}
