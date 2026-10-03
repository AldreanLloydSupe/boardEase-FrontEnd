import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

test("application navigation imports remain compatible with Expo Router 57", async () => {
  for (const directory of ["app", "components", "lib"]) {
    const root = new URL(`../${directory}/`, import.meta.url);
    const paths = await readdir(root, { recursive: true });
    for (const path of paths.filter(path => /\.[jt]sx?$/.test(path))) {
      const source = await readFile(new URL(path.replaceAll("\\", "/"), root), "utf8");
      assert.doesNotMatch(
        source,
        /(?:from\s*|import\s*\(?\s*|require\s*\(\s*)["']@react-navigation\//,
        `${directory}/${path} must use Expo Router navigation APIs`,
      );
    }
  }
});
