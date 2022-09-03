export type OmitStrict<T, Keys extends keyof T> = T extends any
  ? Pick<T, Exclude<keyof T, Keys>>
  : never;
