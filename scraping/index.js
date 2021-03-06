const got = require("got");
const cheerio = require("cheerio");
const fs = require("fs/promises");
const fs_ = require("fs");

const uri = process.argv[2];
const outdir = process.argv[3];
const start = 1;
const end = 253;

console.log(`Getting patterns ${start}-${end} from root uri`, uri);

// https://stackoverflow.com/a/43785891/10833799
const toTitleCase = (str) => {
  const tc = str.toLowerCase().replace(/(?:^|[\s-/])\w/g, (match) => {
    return match.toUpperCase();
  });
  const exceptions = ["In", "And", "Of", "With"];
  return tc
    .split(" ")
    .map((s) => (exceptions.indexOf(s) > -1 ? s.toLowerCase() : s))
    .join(" ")
    .trim();
};

const stripNewlines = (str) => str.replace(/[\n\r]+|[\s]{2,}/g, " ").trim();

const padZeroes = (i) => i.toString().padStart(3, "0");

(async () => {
  for (let i = start; i <= end; i++) {
    try {
      try {
        await fs.mkdir(`${outdir}/${i}`);
        await fs.mkdir(`${outdir}/${i}/all-images`);
      } catch (e) {}
      const res = await got(`${uri}/apl${padZeroes(i)}.htm`);
      const $ = cheerio.load(res.body);
      const getLinks = (el) =>
        el
          .map((j, x) => {
            const self = $(x).attr("href")
              ? parseInt(
                  $(x)
                    .attr("href")
                    .match(/apl(\d+)\.htm/)[1],
                  10
                )
              : undefined;
            const children = $(x)
              .find("a")
              .map((k, a) => {
                return $(a)
                  .attr("href")
                  .match(/apl(\d+)\.htm/)
                  ? parseInt(
                      $(a)
                        .attr("href")
                        .match(/apl(\d+)\.htm/)[1],
                      10
                    )
                  : undefined;
              })
              .get();
            if (self) {
              return [...children, self];
            }
            return children;
          })
          .get()
          .flat()
          .sort((a, b) => a - b);

      const titleMatch = $("p")
        .text()
        .match(/\d+\.? ([\w\s-]+)(\**)/);
      const firstDots =
        $(`img[src="../images/threedots.gif"]`).first().siblings().length === 0
          ? $(`img[src="../images/threedots.gif"]`).first().parent()
          : $(`img[src="../images/threedots.gif"]`).first();
      const others = [1, 10, 18, 33];
      const frontText =
        others.indexOf(i) > -1
          ? firstDots.prevAll("p.header2, span.header2").first().text()
          : firstDots
              .nextAll()
              .filter((j, el) => $(el).text().length > 20)
              .first()
              .text();

      await fs.writeFile(`${outdir}/${i}/front.txt`, stripNewlines(frontText));

      const backTextEl = $("p")
        .filter(function () {
          return $(this).text().trim() === "Therefore:";
        })
        .next();

      const backText = backTextEl.text();
      await fs.writeFile(`${outdir}/${i}/back.txt`, stripNewlines(backText));
      const title = toTitleCase(titleMatch[1]);
      const asterisks = titleMatch[2].length;

      const secondDots =
        $(`img[src="../images/threedots.gif"]`).last().siblings().length === 0
          ? $(`img[src="../images/threedots.gif"]`).last().parent()
          : $(`img[src="../images/threedots.gif"]`).last();
      const bigLinks = getLinks(firstDots.prevAll());

      const smallLinks = getLinks(secondDots.nextAll());

      const meta = { title, asterisks, bigLinks, smallLinks };
      await fs.writeFile(`${outdir}/${i}/meta.json`, JSON.stringify(meta));
      $("img").each(async (j, img) => {
        const image = $(img);
        const forbiddenImages = [
          "../images/threedots.gif",
          "../images/bookmark.gif",
          "../images/shim.gif",
        ];
        if (forbiddenImages.indexOf(image.attr("src")) < 0) {
          await got
            .stream(`${uri}/${image.attr("src")}`)
            .pipe(
              fs_.createWriteStream(
                `${outdir}/${i}/all-images/${
                  image.attr("src").match(/\.\.\/images\/(.*)/)[1]
                }`
              )
            );
          if (image.attr("src") === `../images/${padZeroes(i)}photo.jpg`) {
            // default it
            await got
              .stream(`${uri}/${image.attr("src")}`)
              .pipe(fs_.createWriteStream(`${outdir}/${i}/front.jpg`));
          } else if (
            image.attr("src") === `../images/${padZeroes(i)}diagram.gif`
          ) {
            // default it
            await got
              .stream(`${uri}/${image.attr("src")}`)
              .pipe(fs_.createWriteStream(`${outdir}/${i}/back.gif`));
          }
        }
      });
      console.log(`Finished ${i}: ${title}`);
    } catch (error) {
      console.log("error", error);
    }
  }
})();
