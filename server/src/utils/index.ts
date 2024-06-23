export function getRandomUniqueIndex<T>(arr: T[], usedIndexes: number[]): number {
  const randomIndex = Math.floor(Math.random() * arr.length);

  if (usedIndexes.includes(randomIndex)) {
    return getRandomUniqueIndex(arr, usedIndexes);
  } else {
    usedIndexes.push(randomIndex);
    return randomIndex;
  }
}

export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length;
  let randomIndex: number;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

export function isDrawer(drawerId: string, socketId: string): boolean {
  return drawerId === socketId;
}
