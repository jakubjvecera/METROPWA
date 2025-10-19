const LS_KEY_BATTERY = 'batteryCount';

export function getBatteryCount(defaultValue = 3) {
  const val = localStorage.getItem(LS_KEY_BATTERY);
  return val !== null ? parseInt(val, 10) : defaultValue;
}

export function setBatteryCount(count) {
  localStorage.setItem(LS_KEY_BATTERY, count);
}

export function decreaseBattery() {
  const count = getBatteryCount();
  if (count > 0) {
    setBatteryCount(count - 1);
    return count - 1;
  }
  return 0;
}

export function resetBattery(defaultValue = 3) {
  setBatteryCount(defaultValue);
}
