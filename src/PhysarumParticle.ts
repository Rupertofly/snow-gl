import { randomUniform } from 'd3';
import * as C from './constants';
import { Sensor } from './Sensor';
const { PI, floor, sign, abs, sin, cos, round } = Math;
const TAU = Math.PI * 2;
const fr = randomUniform(PI);
const rA = () => PI / 2 - fr();
export function rotate(startingAngle: number, amount: number) {
  const adjAmount = sign(amount) * (abs(amount) % TAU);
  const adjStartingAngle =
    (TAU + sign(startingAngle) * (abs(startingAngle) % TAU)) % TAU;
  return (TAU + adjStartingAngle + adjAmount) % TAU;
}
export class PhysarumParticle {
  x: number;
  y: number;
  positionMatrix: Uint8Array;
  heading: number = Math.random() * TAU;
  sensorL: Sensor;
  sensorC: Sensor;
  sensorR: Sensor;
  lifeSpan = C.LIFESPAN;
  fieldWidth = C.RADIUS;
  fieldHeight = C.RADIUS;
  lifespan: number;
  static rotate = rotate;
  constructor(x, y, mat: Uint8Array, heading?, wid?, hei?) {
    this.positionMatrix = mat;
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
    this.lifeSpan = C.LIFESPAN;
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
    if (pixelData[i] + C.DEPOSIT > 255) pixelData[i] = 255;
    else pixelData[i] = pixelData[i] + C.DEPOSIT;
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
    // this.lifeSpan--;
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
    const posI = round(this.y) * width + round(this.x);
    const ci = channels * (round(this.y) * width + round(this.x));
    const nX =
      (C.RADIUS + (this.x + C.STEP_LENGTH * cos(this.heading))) % C.RADIUS;
    const nY =
      (C.RADIUS + (this.y + C.STEP_LENGTH * sin(this.heading))) % C.RADIUS;
    // if (nX > width || nX < 0) return this.rotateParticle(Math.random() * TAU);
    // if (nY > height || nY < 0) return this.rotateParticle(Math.random() * TAU);
    const nextPosI = (round(nY) % C.RADIUS) * width + (round(nX) % C.RADIUS);
    const i =
      channels * ((round(nY) % C.RADIUS) * width + (round(nX) % C.RADIUS));
    if (this.positionMatrix[nextPosI] > 0) {
      this.rotateParticle(TAU * Math.random());
      return this;
    }
    this.positionMatrix[posI] = 0;
    this.positionMatrix[nextPosI] = 1;
    this.x = nX;
    this.y = nY;
    this.deposit(pixelData);
  }
}
export default PhysarumParticle;
