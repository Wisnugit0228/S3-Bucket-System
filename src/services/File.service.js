import {
  deleteFile,
  downloadFile,
  uploadFile,
  getFileUrl,
} from "./Bucket.service.js";

class FileService {
  constructor() {
    this.s3Upload = uploadFile;
    this.s3Delete = deleteFile;
    this.s3Download = downloadFile;
    this.s3GetFileUrl = getFileUrl;
  }

  async uploadFile(bucketName, directory, file) {
    const uploadFile = await this.s3Upload(bucketName, directory, file);
    const { Location, Key, Bucket } = uploadFile;
    const keyFile = `${bucketName}/${Key}`;
    const localUrl = Location;
    const publicUrl = `${process.env.S3_PUBLIC_ENDPOINT}/${Bucket}/${Key}`;
    return {
      Key: keyFile,
      localUrl,
      publicUrl,
      Bucket,
    };
  }

  async deleteFile(key) {
    const deleteFile = await this.s3Delete(key);
    return deleteFile;
  }

  async downloadFile(key) {
    const downloadFile = await this.s3Download(key);
    return downloadFile;
  }

  async getFileUrl(key, bucketName = "", expiresIn = 3600) {
    const fileUrl = await this.s3GetFileUrl(key, bucketName, expiresIn);
    return fileUrl;
  }
}

export default new FileService();