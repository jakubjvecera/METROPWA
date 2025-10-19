import * as flashlight from '../mechanics/flashlight.js';
import * as map from '../mechanics/map.js';
import * as gasmask from '../mechanics/gasmask.js';

export const mechanics = {
  flashlight,
  map,
  gasmask
};

export function activateMechanic(name, ...args) {
  if (mechanics[name]?.activate) mechanics[name].activate(...args);
}

export function deactivateMechanic(name, ...args) {
  if (mechanics[name]?.deactivate) mechanics[name].deactivate(...args);
}