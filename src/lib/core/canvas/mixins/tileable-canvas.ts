import buildEvent from '@/utils/build-event';
import Point from '@/utils/point';
import Cursor from '@/utils/cursor';

import CustomCanvas from '../canvas';

const _onMouseMoveHandler = Symbol('_onMouseMoveHandler');
const _onMouseOutHandler = Symbol('_onMouseOutHandler');

const CLASS_NAME = Symbol.for('TileableCanvas');

export const BACKGROUND_LAYER = '-1';
export const ZERO_LAYER = '0';
export const FOREGROUND_LAYER = '1';

export type LAYER_INDEX = '-1' | '0' | '1';

const TileableCanvasMixin = (BaseClass: any = CustomCanvas) => {
  if (!(BaseClass === CustomCanvas || CustomCanvas.isPrototypeOf(BaseClass))) {
    throw new Error('BaseClass isn\'t prototype of CustomCanvas!');
  }

  class TileableCanvas extends BaseClass {
    private _tiles: Map<string, ImageBitmap> = null;
    private _hoverTile: ImageBitmap = null;
    protected _tileSize = {
      x: 16,
      y: 16,
    };

    _layers: Hash<Map<string, ImageBitmap>> = {
      [BACKGROUND_LAYER]: new Map<string, ImageBitmap>(),
      [ZERO_LAYER]: new Map<string, ImageBitmap>(),
      [FOREGROUND_LAYER]: new Map<string, ImageBitmap>(),
    };

    _columnsNumber = 0;
    _rowsNumber = 0;

    // current
    get tiles() { return this._tiles; }
    set tiles(tiles) { throw new Error('It\'s property read only!'); }

    [_onMouseMoveHandler](event: MouseEvent) {
      this._hoverTilePlace(...this._transformEventCoordsToGridCoords(event.offsetX, event.offsetY));
      this._renderInNextFrame();
    }

    [_onMouseOutHandler](event: MouseEvent) {
      this._hoverTilePlace(-1, -1);
      this._renderInNextFrame();
    }

    _getTile(x: number, y: number, z: LAYER_INDEX = ZERO_LAYER) {
      const layer = this._layers[z];
      return layer.get(`${y}|${x}`);
    }

    _updateTileByCoord(x: number, y: number, z: LAYER_INDEX = ZERO_LAYER, tile: ImageBitmap) {
      const layer = this._layers[z];

      if (tile != null) {
        if (layer.get(`${y}|${x}`) === tile) return;
        layer.set(`${y}|${x}`, tile);
      } else {
        if (!layer.has(`${y}|${x}`)) return;
        layer.delete(`${y}|${x}`);
      }
      // @TODO Optimization
      // layer.isDirty = true;
    }

    _hoverTilePlace(x: number, y: number) {
      for (const [place, tile] of this._layers[FOREGROUND_LAYER].entries()) {
        if (tile != null) {
          const [_y, _x] = Point.fromString(place).toArray();
          if (Point.isEqual(x, y, _x, _y)) return;

          this._updateTileByCoord(_x, _y, FOREGROUND_LAYER, null);
        }
      }
      this._updateTileByCoord(x, y, FOREGROUND_LAYER, this._hoverTile);
    }

    _drawTiles() {
      this._drawLayer(this._layers[BACKGROUND_LAYER]);
      this._drawLayer(this._layers[ZERO_LAYER]);
      this._drawLayer(this._layers[FOREGROUND_LAYER]);
    }

    _drawLayer(layer: Map<string, ImageBitmap>) {
      for (const [place, tile] of layer.entries()) {
        const [y, x] = Point.fromString(place).toArray();
        this._ctx.drawImage(
          tile,
          x * this._tileSize.x,
          y * this._tileSize.y,
          this._tileSize.x,
          this._tileSize.y,
        );
      }

      // @TODO Optimization
      // if (layer.isDirty) {
      //   layer.isDirty = false;
      //   for (const [place, tile] of layer.entries()) {
      //     const [y, x] = Point.fromString(place).toArray();
      //     layer.cache.drawImage(
      //       tile,
      //       x) * this._tileSize.x,
      //       y * this._tileSize.y,
      //       this._tileSize.x,
      //       this._tileSize.y,
      //     );
      //   }
      //   this._ctx.drawImage(layer.cache, 0, 0, this._el.width, this._el.height);
      // } else {
      //   // Render cache of the layer
      //   this._ctx.drawImage(layer.cache, 0, 0, this._el.width, this._el.height);
      // }
    }

    private _drawGrid() {
      this._ctx.save();
      this._ctx.strokeStyle = 'hsla(0, 100%, 0%, 60%)';
      this._ctx.beginPath();
      this._ctx.setLineDash([4, 2]);
      this._ctx.lineWidth = 1;
      for (let i = 0; i <= this._columnsNumber; i += 1) {
        const lineX = i * this._tileSize.x;
        this._ctx.moveTo(lineX, 0);
        this._ctx.lineTo(lineX, this.height);
      }
      for (let i = 0; i <= this._rowsNumber; i += 1) {
        const lineY = i * this._tileSize.y;
        this._ctx.moveTo(0, lineY);
        this._ctx.lineTo(this.width, lineY);
      }
      this._ctx.stroke();
      this._ctx.restore();
    }

    protected _render(time: number, clearRender = false) {
      // @TODO That time might be used for checking time between renders
      this._ctx.imageSmoothingEnabled = this._imageSmoothingEnabled;
      this.clear();
      this._drawTiles();
      this.dispatchEvent(buildEvent(':render', null, { ctx: this._ctx }));
      if (!clearRender) this._drawGrid();
    }

    private _calcGrid() {
      this._columnsNumber = Math.trunc(this.width / this._tileSize.x);
      this._rowsNumber = Math.trunc(this.height / this._tileSize.y);
    }

    protected _transformEventCoordsToGridCoords(eventX: number, eventY: number): [number, number] {
      return [Math.trunc(eventX / this._tileSize.x), Math.trunc(eventY / this._tileSize.y)];
    }

    protected async _initListeners() {
      await super._initListeners();

      this._el.addEventListener('mousemove', this[_onMouseMoveHandler], { passive: true });
      this._el.addEventListener('mouseout', this[_onMouseOutHandler], { passive: true });
    }

    private async _prepareHoverTileMask() {
      const canvas = document.createElement('canvas');
      Reflect.set(this._el.style, 'image-rendering', 'pixelated');
      canvas.width = this._tileSize.x;
      canvas.height = this._tileSize.y;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'hsla(0, 0%, 0%, .1)';
      ctx.fillRect(0, 0, this._tileSize.x, this._tileSize.y);
      this._hoverTile = await createImageBitmap(canvas, 0, 0, this._tileSize.x, this._tileSize.y);
    }

    protected _resize(multiplier: number) {
      this._tileSize.x *= multiplier;
      this._tileSize.y *= multiplier;
      if (super._resize) super._resize(multiplier);
      this._renderInNextFrame();
    }

    constructor(options: any = {}) {
      super(options);

      this[_onMouseMoveHandler] = this[_onMouseMoveHandler].bind(this);
      this[_onMouseOutHandler] = this[_onMouseOutHandler].bind(this);

      if (options.tileSize != null && options.tileSize.x != null) this._tileSize.x = options.tileSize.x;
      if (options.tileSize != null && options.tileSize.y != null) this._tileSize.y = options.tileSize.y;
    }

    async init() {
      this._calcGrid();

      await this._prepareHoverTileMask();

      await super.init();
    }

    public async updateCurrentTiles(tiles: Map<string, ImageBitmap>) {
      this._tiles = tiles;
    }
  }

  TileableCanvas._metaClassNames = [...(BaseClass._metaClassNames || []), CLASS_NAME];

  return TileableCanvas;
};

export default TileableCanvasMixin;

export const TileableCanvas = TileableCanvasMixin();
