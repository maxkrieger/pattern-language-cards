const fs = require("fs");
const fsp = require("fs/promises");

const path = process.argv[2];

(async () => {
  const ws = fs.createWriteStream(`output.csv`, { flags: "w" });
  ws.write(
    `number,name,category,asterisk2,asterisk3,biggerlinks,smallerlinks,fronttext,backtext,frontimage,backimage\n`
  );
  const githubURI =
    "https://raw.githubusercontent.com/maxkrieger/pattern-language-cards/master/patterns/";
  const items = await fsp.readdir(path);
  for await (const p of items) {
    const i = parseInt(p, 10);
    const meta = JSON.parse(await fsp.readFile(`${path}/${p}/meta.json`));
    const fronttext = await fsp.readFile(`${path}/${p}/front.txt`);
    const backtext = await fsp.readFile(`${path}/${p}/back.txt`);
    const arr = [
      p,
      meta.title.toUpperCase(),
      i <= 94 ? "TOWNS" : i <= 204 ? "BUILDINGS" : "CONSTRUCTION",
      meta.asterisks > 0 ? "/100%" : "/80%",
      meta.asterisks > 1 ? "/100%" : "/80%",
      meta.bigLinks.join(", "),
      meta.smallLinks.join(", "),
      fronttext.toString().replace(/"/g, '""'),
      backtext.toString().replace(/"/g, '""'),
      `${githubURI}/${p}/front.jpg`,
      `${githubURI}/${p}/back.gif`,
    ];
    ws.write(arr.map((s) => `"${s}"`).join(",") + "\n");
  }
  ws.end();
})();
