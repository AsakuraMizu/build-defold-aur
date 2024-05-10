import { readFile, writeFile, appendFile } from "node:fs/promises";
import { EOL } from "node:os";

const resp = await fetch("https://d.defold.com/stable/info.json");
const { version, sha1 } = await resp.json();

const { GITHUB_OUTPUT } = process.env;
function setOutput(obj) {
  if (GITHUB_OUTPUT) {
    appendFile(
      GITHUB_OUTPUT,
      Object.entries(obj)
        .map(([name, value]) => `${name}=${value}${EOL}`)
        .join("")
    );
  }
  console.log(obj);
}

setOutput({ version, sha1 });

const pre = await readFile("VERSION", { encoding: "ascii" });

if (version !== pre) {
  await writeFile("VERSION", version);

  const pkgbuild = await readFile("PKGBUILD.in", { encoding: "utf-8" });
  await writeFile("PKGBUILD", pkgbuild.replace("@VERSION@", version));

  setOutput({ update: true });
} else {
  setOutput({ update: false });
}
