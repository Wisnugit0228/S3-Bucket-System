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
    buffer = await sharp(file.buffer).webp({ quality: 20 }).toBuffer();

    const nameWithoutExt = path.parse(file.originalname).name;
    filename = `${nameWithoutExt}.webp`;
    contentType = "image/webp";
  }

  const key = `${directory}/${filename}`;

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
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
