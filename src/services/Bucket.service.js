import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

export const uploadFile = async (dir, file) => {
  const s3 = new AWS.S3({
    endpoint: process.env.MINIO_ENDPOINT,
    accessKeyId: process.env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  const key = `${dir}/${uuidv4()}-${file.originalname}`;

  const params = {
    Bucket: process.env.MINIO_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };
  return s3.upload(params).promise();
};

export const deleteFile = async (key) => {
  const s3 = new AWS.S3({
    endpoint: process.env.MINIO_ENDPOINT,
    accessKeyId: process.env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  const params = {
    Bucket: process.env.MINIO_BUCKET_NAME,
    Key: key,
  };

  return s3.deleteObject(params).promise();
};
