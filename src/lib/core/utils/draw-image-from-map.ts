import Tile from './tile';
import Point from './point';
import getTilesRectSizes from './get-tiles-rect-size';

export default (
  tiles: Map<string, Tile>,
  ctx: CanvasRenderingContext2D,
  width: number = 64,
  height: number = 64,
  contain: boolean = false,
) => {
  const canvasWidth = width;
  const canvasHeight = height;
  const { xCount, yCount } = getTilesRectSizes(tiles);

  const maxAxios = Math.max(xCount, yCount);
  const tileWidth = canvasWidth / (contain ? maxAxios : xCount);
  const tileHeight = canvasHeight / (contain ? maxAxios : yCount);

  for (const [place, tile] of tiles.entries()) {
    const [y, x] = Point.fromString(place).toArray();
    ctx.drawImage(tile.bitmap, x * tileWidth, y * tileHeight, tileWidth, tileHeight);
  }
};
