const path = require("path");
const pkg = require(path.resolve("./package.json"));

const dist = path.resolve(__dirname, "../dist");
const src = path.resolve(__dirname, "../src");

require("rimraf").sync(dist);

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

// ESM
require("esbuild").buildSync({
  entryPoints: [path.join(src, "index.ts")],
  format: "cjs",
  bundle: true,
  minify: false,
  sourcemap: false,
  target: ["esnext"],
  outfile: path.join(dist, "dakiya.js"),
  external,
});
