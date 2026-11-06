import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
      region: "auto",
      forcePathStyle: true,
    });
  }
  return s3Instance;
};

/**
 * Helper untuk mengekstrak bucketName dan cleanKey dari string input
 */
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

/**
 * Cek apakah file/bucket benar-benar ada di S3/R2
 */
export const fileExists = async (bucketName, key) => {
  try {
    await getS3Client().send(
      new HeadObjectCommand({ Bucket: bucketName, Key: key })
    );
    return true;
  } catch (error) {
    // Jika bucket/key tidak ditemukan, AWS SDK melempar error status 404 / NotFound
    return false;
  }
};

/**
 * Menerima Key/Path dan mengembalikan Presigned URL hanya jika file/bucket valid
 */
export const getFileUrl = async (key, bucketName = "", expiresIn = 3600) => {
  try {
    if (!key) return null;

    const { bucketName: activeBucket, key: cleanKey } = extractBucketAndKey(
      key,
      bucketName
    );

    if (!activeBucket || !cleanKey) {
      return null;
    }

    // 1. VALIDASI: Cek langsung ke S3/R2 apakah bucket & file tersebut ada
    const exists = await fileExists(activeBucket, cleanKey);
    if (!exists) {
      console.warn(`[GetFileUrl Fail] Bucket atau Key tidak ditemukan: ${activeBucket}/${cleanKey}`);
      return null; // Mengembalikan null jika bucketName/key salah
    }

    // 2. Jika valid, buatkan URL
    const publicDomain = process.env.S3_PUBLIC_DOMAIN;

    if (publicDomain) {
      return `${publicDomain.replace(/\/$/, "")}/${activeBucket}/${cleanKey}`;
    }

    const command = new GetObjectCommand({
      Bucket: activeBucket,
      Key: cleanKey,
    });

    const fileUrl = await getSignedUrl(getS3Client(), command, { expiresIn });
    return fileUrl;
  } catch (error) {
    console.error("Error generating Presigned URL:", error);
    return null;
  }
};

/**
 * Upload file ke S3/R2
 */
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

/**
 * Hapus file dari S3/R2
 */
export const deleteFile = async (keyInput) => {
  const { bucketName, key } = extractBucketAndKey(keyInput);

  const command = new DeleteObjectCommand({
    Bucket: bucketName || process.env.S3_BUCKET_NAME,
    Key: key,
  });

  return getS3Client().send(command);
};

/**
 * Download file
 */
export const downloadFile = async (keyInput) => {
  const { bucketName, key } = extractBucketAndKey(keyInput);

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getS3Client().send(command);
};