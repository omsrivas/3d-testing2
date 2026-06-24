import type { Grid, GridCell, BoundingBox } from "@/types/geometry";
import type { Room } from "@/types/house";

export function createGrid(
  width: number,
  height: number,
  cellSize: number
): Grid {
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const cells: GridCell[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      col,
      row,
      occupied: false,
    }))
  );
  return { cols, rows, cellSize, cells };
}

export function markRoomOnGrid(grid: Grid, room: Room): void {
  const startCol = Math.floor(room.position.x / grid.cellSize);
  const startRow = Math.floor(room.position.y / grid.cellSize);
  const endCol = Math.ceil(
    (room.position.x + room.dimensions.width) / grid.cellSize
  );
  const endRow = Math.ceil(
    (room.position.y + room.dimensions.height) / grid.cellSize
  );

  for (let row = startRow; row < endRow && row < grid.rows; row++) {
    for (let col = startCol; col < endCol && col < grid.cols; col++) {
      if (grid.cells[row]?.[col]) {
        grid.cells[row][col].occupied = true;
        grid.cells[row][col].roomId = room.id;
      }
    }
  }
}

export function findFreeCell(grid: Grid): GridCell | null {
  for (const row of grid.cells) {
    for (const cell of row) {
      if (!cell.occupied) return cell;
    }
  }
  return null;
}

export function getBoundingBox(room: Room): BoundingBox {
  return {
    x: room.position.x,
    y: room.position.y,
    width: room.dimensions.width,
    height: room.dimensions.height,
  };
}

export function doBoxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
