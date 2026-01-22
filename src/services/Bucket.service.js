import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

export const uploadFile = async (dir, file) => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  const key = `${dir}/${uuidv4()}-${file.originalname}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
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

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  };

  return s3.getObject(params).promise();
};

export const listFolders = async (prefix = "") => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: prefix,
    Delimiter: "/",
  };

  const data = await s3.listObjectsV2(params).promise();
  return data.CommonPrefixes.map((p) => p.Prefix);
};

export const listObjectsByPrefix = async (prefix) => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: prefix,
  };

  const data = await s3.listObjectsV2(params).promise();
  return data.Contents;
};
