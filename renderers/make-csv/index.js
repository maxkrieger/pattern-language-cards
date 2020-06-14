const fs = require("fs");
const fsp = require("fs/promises");

const path = process.argv[2];

(async () => {
  const ws = fs.createWriteStream(`output.csv`, { flags: "a" });
  ws.write(
    `number,name,asterisks,biggerlinks,smallerlinks,fronttext,backtext,frontimage,backimage\n`
  );
  const githubURI =
    "https://raw.githubusercontent.com/maxkrieger/pattern-language-cards/master/patterns/";
  const items = await fsp.readdir(path);
  for await (const p of items) {
    const meta = JSON.parse(await fsp.readFile(`${path}/${p}/meta.json`));
    const fronttext = await fsp.readFile(`${path}/${p}/front.txt`);
    const backtext = await fsp.readFile(`${path}/${p}/back.txt`);
    ws.write(
      `${p},"${meta.title}",${meta.asterisks},"${meta.bigLinks.join(
        ", "
      )}","${meta.smallLinks.join(
        ", "
      )}","${fronttext}","${backtext}",${githubURI}/${p}/front.jpg,${githubURI}/${p}/back.gif\n`
    );
  }
  ws.end();
})();
