import crypto from "crypto";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const SIGN_SECRET = process.env.JWT_SECRET || process.env.S3_SECRET_ACCESS_KEY || "default-secret-key";

// Lazy Singleton Client
let s3Instance = null;

const getS3Client = () => {
  if (!s3Instance) {
    const endpoint = process.env.S3_ENDPOINT;

    if (!endpoint) {
      throw new Error("S3_ENDPOINT tidak terdefinisi di environment variable.");
    }

    s3Instance = new S3Client({
      endpoint,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
      region: "us-east-1",
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return s3Instance;
};

export const extractBucketAndKey = (urlOrKey, defaultBucket = "") => {
  if (!urlOrKey) return { bucketName: defaultBucket, key: "" };

  let rawPath = urlOrKey;

  if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
    try {
      const urlObj = new URL(rawPath);
      rawPath = urlObj.pathname;
    } catch {
      // abaikan jika parsing URL gagal
    }
  }

  let cleanPath = decodeURIComponent(rawPath.replace(/^\/+/, ""));

  if (defaultBucket && cleanPath.startsWith(`${defaultBucket}/`)) {
    cleanPath = cleanPath.replace(`${defaultBucket}/`, "");
    return { bucketName: defaultBucket, key: cleanPath };
  }

  if (cleanPath.includes("/")) {
    const parts = cleanPath.split("/");
    const bucketName = parts.shift();
    const key = parts.join("/");
    return { bucketName, key };
  }

  return {
    bucketName: defaultBucket || process.env.S3_BUCKET_NAME || "",
    key: cleanPath,
  };
};

export const fileExists = async (bucketName, key) => {
  try {
    await getS3Client().send(
      new HeadObjectCommand({ Bucket: bucketName, Key: key })
    );
    return true;
  } catch (error) {
    return false;
  }
};

export const getFileUrl = async (key, bucketName = "", expiresIn = 3600) => {
  try {
    if (!key) return null;

    const { bucketName: activeBucket, key: cleanKey } = extractBucketAndKey(
      key,
      bucketName
    );

    if (!activeBucket || !cleanKey) return null;

    const exists = await fileExists(activeBucket, cleanKey);
    if (!exists) {
      console.warn(`[GetFileUrl Fail] Bucket atau Key tidak ditemukan: ${activeBucket}/${cleanKey}`);
      return null;
    }

    const publicDomain = process.env.S3_PUBLIC_DOMAIN;
    if (publicDomain) {
      return `${publicDomain.replace(/\/$/, "")}/${activeBucket}/${cleanKey}`;
    }

    const command = new GetObjectCommand({
      Bucket: activeBucket,
      Key: cleanKey,
    });

    return await getSignedUrl(getS3Client(), command, { expiresIn });
  } catch (error) {
    console.error("Error generating Presigned URL:", error);
    return null;
  }
};

export const uploadFile = async (bucketName, directory, file) => {
  const key = `${directory}/${file.originalname}`;

  const upload = new Upload({
    client: getS3Client(),
    params: {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    },
  });

  const result = await upload.done();

  return {
    Location: result.Location,
    Key: result.Key,
    Bucket: result.Bucket,
  };
};

export const deleteFile = async (keyInput) => {
  const { bucketName, key } = extractBucketAndKey(keyInput);

  const command = new DeleteObjectCommand({
    Bucket: bucketName || process.env.S3_BUCKET_NAME,
    Key: key,
  });

  return getS3Client().send(command);
};

export const downloadFile = async (keyInput) => {
  const { bucketName, key } = extractBucketAndKey(keyInput);

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getS3Client().send(command);
};

export const generateBackendSignedUrl = async (key, bucketName = "", expiresIn = 3600, baseUrl = "") => {
  const { bucketName: activeBucket, key: cleanKey } = extractBucketAndKey(key, bucketName);

  if (!activeBucket || !cleanKey) return null;

  const exists = await fileExists(activeBucket, cleanKey);
  if (!exists) return null;

  const fullKey = `${activeBucket}/${cleanKey}`;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const payload = `${fullKey}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", SIGN_SECRET)
    .update(payload)
    .digest("hex");

  const hostUrl = (process.env.APP_URL || baseUrl).replace(/\/$/, "");
  // Sesuaikan path '/files/view' atau '/api/files/view' sesuai prefix route di app.js Anda
  return `${hostUrl}/files/view?key=${encodeURIComponent(fullKey)}&expires=${expiresAt}&sig=${signature}`;
};

export const verifyBackendSignature = (fullKey, expires, signature) => {
  if (!fullKey || !expires || !signature) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now > parseInt(expires, 10)) return false;

  const expectedSig = crypto
    .createHmac("sha256", SIGN_SECRET)
    .update(`${fullKey}:${expires}`)
    .digest("hex");

  // Pastikan panjang buffer sama sebelum timingSafeEqual agar tidak throw error jika signature dimanipulasi
  if (signature.length !== expectedSig.length) return false;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
};