export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const removeFromArray = <T>(a: Array<T>, b: Array<T>) => {
  return a.filter((item) => !b.includes(item));
};
