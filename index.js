const path = require("path");
const fs = require("fs");
const outputMp3ByNCM = require("./util");

const sourcePath = path.join(__dirname, "./sourcePath");
const outputPath = path.join(__dirname, "./outputPath/");
const imgOutputPath = path.join(__dirname, "./outputPath/meta");

const formatExt = '.ncm'

function readSourcePath() {
  const files = fs.readdirSync(sourcePath);

  if (files?.length) {
    files.forEach((fileName) => {
      const extname = path.extname(fileName);
      const realName = fileName.split(extname)?.[0];
      if (extname.includes(formatExt)) {
        outputMp3ByNCM(
          path.join(sourcePath, fileName),
          path.join(outputPath, realName + ".mp3"),
          path.join(imgOutputPath, realName + ".png"),
          realName
          );
        } else {
          console.log(`${fileName}不是ncm音频文件`)
      }
    });
  }
}

readSourcePath();
