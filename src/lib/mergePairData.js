export function mergePairData(builtInData, customPairs) {
  if (!customPairs || Object.keys(customPairs).length === 0) {
    return builtInData;
  }
  return { ...builtInData, ...customPairs };
}
