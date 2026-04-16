import AWS from "aws-sdk";
import sharp from "sharp";
import path from "path";
// import { v4 as uuidv4 } from "uuid";

export const uploadFile = async (bucketName, directory, file) => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  let buffer = file.buffer;
  let contentType = file.mimetype;
  let filename = file.originalname;

  if (file.mimetype.startsWith("image/")) {
    const MAX_SIZE = 200 * 1024;

    let quality = 82;
    let width = 1600;

    let outputBuffer;

    while (true) {
      outputBuffer = await sharp(file.buffer)
        .resize({ width, withoutEnlargement: true })
        .webp({
          quality,
          effort: 6,
        })
        .toBuffer();

      if (outputBuffer.length <= MAX_SIZE) break;

      if (quality > 50) {
        quality -= 5;
      } else if (width > 800) {
        width -= 200;
      } else {
        break;
      }
    }

    buffer = outputBuffer;

    // ambil nama original tanpa ekstensi
    const parsed = path.parse(file.originalname);

    // sanitize nama file (hindari karakter aneh)
    const safeName = parsed.name.replace(/[^a-zA-Z0-9-_]/g, "_");

    // pilih salah satu:

    // OPTION 1: pure original (RISIKO overwrite)
    // filename = `${safeName}.webp`;

    // OPTION 2: original + unique (RECOMMENDED)
    const unique = Date.now();
    filename = `${safeName}-${unique}.webp`;

    contentType = "image/webp";
  }

  const key = `${directory}/${filename}`;

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000", // optional tapi bagus
  };

  return s3.upload(params).promise();
};

export const deleteFile = async (key) => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  };

  return s3.deleteObject(params).promise();
};

export const downloadFile = async (key) => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  // pisahkan bucket & key
  const parts = key.split("/");
  const bucketName = parts.shift();
  const keyFile = parts.join("/");

  const params = {
    Bucket: bucketName,
    Key: keyFile,
  };

  return s3.getObject(params).promise();
};
