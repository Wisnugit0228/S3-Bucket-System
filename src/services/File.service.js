import { deleteFile, downloadFile, uploadFile } from "./Bucket.service.js";

class FileService {
  constructor() {
    this.s3Upload = uploadFile;
    this.s3Delete = deleteFile;
    this.s3Download = downloadFile;
  }
  async uploadFile(dir, file) {
    const uploadFile = await this.s3Upload(dir, file);
    const { Location, Key, Bucket } = uploadFile;
    const localUrl = Location;
    const publicUrl = `${process.env.MS3_PUBLIC_ENDPOINT}/${Bucket}/${Key}`;
    return {
      Key,
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
}

export default new FileService();
