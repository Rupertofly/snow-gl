import { randomUniform } from 'd3';
import * as C from './constants';
const { PI, floor, sign, abs, sin, cos, round } = Math;
const TAU = Math.PI * 2;
const fr = randomUniform(PI);
const rA = () => PI / 2 - fr();
class Sensor {
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
    const nX = (1080 + round(startX + dist * cos(angle))) % 1080;
    const nY = (1080 + round(startY + dist * sin(angle))) % 1080;
    this.x = nX;
    this.y = nY;
    return this;
  }
}
export function rotate(startingAngle: number, amount: number) {
  const adjAmount = sign(amount) * (abs(amount) % TAU);
  const adjStartingAngle =
    (TAU + sign(startingAngle) * (abs(startingAngle) % TAU)) % TAU;
  return (TAU + adjStartingAngle + adjAmount) % TAU;
}
export class PhysarumParticle {
  x: number;
  y: number;
  heading: number = Math.random() * TAU;
  sensorL: Sensor;
  sensorC: Sensor;
  sensorR: Sensor;
  lifeSpan = C.LIFESPAN;
  fieldWidth = C.RADIUS;
  fieldHeight = C.RADIUS;
  lifespan: number;
  static rotate = rotate;
  constructor(x, y, heading?, wid?, hei?) {
    this.x = x;
    this.y = y;
    this.heading = heading ?? this.heading;
    this.fieldHeight = hei ?? this.fieldHeight;
    this.fieldWidth = wid ?? this.fieldWidth;
    this.sensorL = new Sensor(0, 0).updateFromPhy(
      this.x,
      this.y,
      rotate(this.heading, C.SENSOR_ANGLE)
    );
    this.sensorC = new Sensor(0, 0).updateFromPhy(this.x, this.y, this.heading);
    this.lifeSpan = 900;
    this.sensorR = new Sensor(0, 0).updateFromPhy(
      this.x,
      this.y,
      this.heading,
      -1 * C.SENSOR_ANGLE
    );
  }
  deposit(
    pixelData: Uint8Array,
    width = this.fieldWidth,
    height = this.fieldHeight,
    channels = 4
  ) {
    const i = channels * (round(this.y) * width + round(this.x));

    pixelData[i] += C.DEPOSIT;
    pixelData[i + 1] = floor((this.heading / TAU) * 255);
  }
  senseAndTurn(
    pixelData: ArrayLike<number>,
    width = this.fieldWidth,
    height = this.fieldHeight,
    channels = 4
  ) {
    const LVal = this.sensorL.getSensorValue(
      pixelData,
      width,
      height,
      channels
    );
    const CVal = this.sensorC.getSensorValue(
      pixelData,
      width,
      height,
      channels
    );
    const RVal = this.sensorR.getSensorValue(
      pixelData,
      width,
      height,
      channels
    );
    this.lifeSpan--;
    if (CVal > LVal && CVal > RVal) {
      return;
    } else if (CVal < LVal && CVal < RVal) {
      if (Math.random() < 0.5) this.rotateParticle(C.TURN_ANGLE);
      else;
      this.rotateParticle(-1 * C.TURN_ANGLE);
    } else if (LVal < RVal) {
      this.rotateParticle(-1 * C.TURN_ANGLE);
    } else if (RVal < LVal) {
      this.rotateParticle(C.TURN_ANGLE);
    }
  }
  rotateParticle(amt: number) {
    const newHeading = rotate(this.heading, amt);
    this.heading = newHeading;
    this.sensorL.updateFromPhy(
      this.x,
      this.y,
      rotate(newHeading, C.SENSOR_ANGLE)
    );
    this.sensorC.updateFromPhy(this.x, this.y, newHeading);
    this.sensorR.updateFromPhy(
      this.x,
      this.y,
      rotate(newHeading, -1 * C.SENSOR_ANGLE)
    );
  }
  attemptMove(
    pixelData: Uint8Array,
    width = this.fieldWidth,
    height = this.fieldHeight,
    channels = 4
  ) {
    const nX = (1080 + (this.x + C.STEP_LENGTH * cos(this.heading))) % 1080;
    const nY = (1080 + (this.y + C.STEP_LENGTH * sin(this.heading))) % 1080;
    // if (nX > width || nX < 0) return this.rotateParticle(Math.random() * TAU);
    // if (nY > height || nY < 0) return this.rotateParticle(Math.random() * TAU);
    const i = channels * (floor(nY) * width + floor(nX));
    if (i < 0 || i > pixelData.length) {
      return this.rotateParticle(Math.random() * TAU);
    }
    this.x = nX;
    this.y = nY;
    this.deposit(pixelData);
  }
}
export default PhysarumParticle;
