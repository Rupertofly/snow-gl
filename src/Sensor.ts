import * as C from './constants';
const { PI, floor, sign, abs, sin, cos, round } = Math;
export class Sensor {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  getSensorValue(
    pixels: ArrayLike<number>,
    width: number,
    height: number,
    channels = 4
  ) {
    const i = channels * (this.y * width + this.x);
    if (i < 0 || i > pixels.length) {
      return 0;
    }
    return pixels[i];
  }
  updateFromPhy(
    startX: number,
    startY: number,
    angle: number,
    dist: number = C.SENSOR_OFFSET
  ) {
    const nX = (C.RADIUS + startX + dist * cos(angle)) % C.RADIUS;
    const nY = (C.RADIUS + startY + dist * sin(angle)) % C.RADIUS;
    this.x = nX;
    this.y = nY;
    return this;
  }
}
