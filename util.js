const { readFileSync, writeFileSync } = require("fs");
const { createDecipheriv } = require("crypto");

/** ncm文件固定 */
const KEY = "687a4852416d736f356b496e62617857";
const META_KEY = "2331346C6A6B5F215C5D2630553C2728"
/** 解密的key */
const key = Buffer.from(KEY, "hex");
const metaKey = Buffer.from(META_KEY, "hex");

function outputMp3ByNCM(sourcePath, outputPath, outputImgPath, realName) {
  const content = readFileSync(sourcePath);
  const buff = Buffer.from(content);

  let start = 0;

  // 1. 读取 8 字节,获取 magic header
  let temp = buff.slice(start, start + 8);
  start += 10; // 空余 2 字节
  let header = Buffer.from([0x43, 0x54, 0x45, 0x4e, 0x46, 0x44, 0x41, 0x4d]);
  if (!header.equals(temp)) {
    console.log(`${realName}不是ncm音频文件或者文件已经损坏`);
    return;
  }

  // 2. 读取 32 位 4字节的密钥长度
  let keyLength = buff.readUInt32LE(start);
  start += 4;
  //3. 根据密钥长度读取密钥内容
  temp = buff.slice(start, start + keyLength);
  let cipherText = temp.map((t) => {
    return t ^ 0x64;
  });
  start += keyLength;

  // aes-128-ecb 解密
  const decipher = createDecipheriv("aes-128-ecb", key, "");
  let decodeText = decipher.update(cipherText);
  decodeText += decipher.final();

  // 得到 keyData
  let keyData = decodeText.substr(17).trim();
  const key2Len = keyData.length;
  keyData = Buffer.from(keyData);

  // 将 keyData 做 RC4-KSA 算法解密
  const keyBox = Buffer.alloc(256);
  for (let i = 0; i < keyBox.length; i++) {
    keyBox[i] = i;
  }
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (keyBox[i] + j + keyData[i % key2Len]) & 0xff;
    [keyBox[i], keyBox[j]] = [keyBox[j], keyBox[i]];
  }

  // 读取4字节获取meta 长度
  let metaLen = buff.readUInt32LE(start);
  start += 4;

  // 读取 meta 内容
  let metaContent = buff.slice(start, start + metaLen);
  metaContent = metaContent.map((t) => t ^ 0x63);

  // 去掉 22位 163 key(Don't modify):
  metaContent = metaContent.toString();
  metaContent = metaContent.substr(22);
  metaContent = Buffer.from(metaContent, "base64");

  // 解密 meta 内容
  let decipher2 = createDecipheriv("aes-128-ecb", metaKey, "");
  let meta = decipher2.update(metaContent);
  meta += decipher2.final("utf8");

  meta = meta.substr(6);
  meta = JSON.parse(meta);
  start += metaLen;

  // 5字节空白
  start += 5;
  // 读取 4字节 crc32校验码
  buff.readUInt32LE(start);
  start += 4;

  // 读取4字节图片大小
  const imgLen = buff.readUInt32LE(start);
  start += 4;

  // 写入图片数据
  let outputImgPullPath = outputImgPath
    ? outputImgPath
    : outputPath.split(".mp3")[0] + ".png";
  writeFileSync(outputImgPullPath, buff.slice(start, start + imgLen));
  start += imgLen;

  const audioData = buff.slice(start);
  let m = 0;
  for (let i = 1; i < audioData.length + 1; i++) {
    m = i & 0xff;
    audioData[i - 1] ^=
      keyBox[(keyBox[m] + keyBox[(keyBox[m] + m) & 0xff]) & 0xff];
  }

  writeFileSync(outputPath, audioData);
  console.log(`${realName} 转换成功！`);
}

module.exports = outputMp3ByNCM;
