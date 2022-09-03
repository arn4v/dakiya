import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["js", "json", "ts"],
  forceExit: true
};

export default config;
