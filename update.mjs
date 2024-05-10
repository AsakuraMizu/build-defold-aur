import { readFile, writeFile } from "node:fs/promises";

const resp = await fetch("https://d.defold.com/stable/info.json");
const { version, sha1 } = await resp.json();

console.log(`::set-output name=version::${version}`);
console.log(`::set-output name=sha1::${sha1}`);

const pre = await readFile("VERSION", { encoding: "ascii" });

if (version !== pre) {
  await writeFile("VERSION", version);
  console.log(`::set-output name=update::true`);
} else {
  console.log(`::set-output name=update::false`);
}
