import ky from "https://cdn.skypack.dev/ky?dts";
import * as semver from "https://deno.land/x/semver@v1.4.0/mod.ts";

interface Info {
  version: string;
  sha1: string;
}

async function md5sum(path: string) {
  const p = Deno.run({ cmd: ["md5sum", path], stdout: "piped" });
  const output = await p.output();
  p.close();
  return new TextDecoder().decode(output).split(" ")[0];
}

class Item {
  static base = "http://d.defold.com/archive/";

  file: string;
  url = "";
  md5 = "";

  constructor(public name: string, public path: string, public editor = false) {
    this.file = path.split("/").reverse()[0];
  }

  async download(sha1: string) {
    this.url =
      Item.base +
      (this.editor ? "editor-alpha" : "stable") +
      "/" +
      sha1 +
      "/" +
      this.path;
    console.log(this.url);
    await Deno.run({ cmd: ["wget", this.url, "-O", this.file] }).status();
    this.md5 = await md5sum(this.file);
  }

  inject(pkgbuild: string) {
    return pkgbuild
      .replace(`!!${this.name}URL!!`, this.url)
      .replace(`!!${this.name}HASH!!`, this.md5);
  }
}

const infoUrl = "http://d.defold.com/stable/info.json";
const pkgbuildPath = "./template/PKGBUILD";
const desktopPath = "./template/Defold.desktop";

let flag = false;

let info: Info;
let oldVersion: string;
let desktopMd5: string;

const editor = new Item(
  "EDITOR",
  "editor-alpha/editor2/Defold-x86_64-linux.zip",
  true
);
const sdk = new Item("SDK", "engine/defoldsdk.zip");
const bob = new Item("BOB", "bob/bob.jar");

async function check() {
  info = await ky.get(infoUrl).json<Info>();
  oldVersion = await Deno.readTextFile("./VERSION");
  if (semver.gt(info.version, oldVersion)) {
    await Deno.writeTextFile("./VERSION", info.version);
    flag = true;
  }
}

async function updateDesktop() {
  const desktop = (await Deno.readTextFile(desktopPath)).replace(
    "!!VERSION!!",
    info.version
  );
  await Deno.writeTextFile(desktopPath, desktop);

  desktopMd5 = await md5sum(desktopPath);
}

async function updatePkgbuild() {
  let pkgbuild = await Deno.readTextFile(pkgbuildPath);
  pkgbuild = pkgbuild
    .replace("!!VERSION!!", info.version)
    .replace("!!DESKTOPHASH!!", desktopMd5);
  pkgbuild = editor.inject(pkgbuild);
  pkgbuild = sdk.inject(pkgbuild);
  pkgbuild = bob.inject(pkgbuild);
  await Deno.writeTextFile(pkgbuildPath, pkgbuild);
}

async function main() {
  await check();
  if (flag) {
    await editor.download(info.sha1);
    await sdk.download(info.sha1);
    await bob.download(info.sha1);
    await updateDesktop();
    await updatePkgbuild();
    console.log(`::set-output name=version::${info.version}`);
    console.log(`::set-output name=sha1::${info.sha1}`);
  }
  console.log(`::set-output name=flag::${flag}`);
}

main();
