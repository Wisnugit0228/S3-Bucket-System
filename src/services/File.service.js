import { deleteFile, uploadFile } from "./Bucket.service.js";

class FileService {
  constructor() {
    this.s3Upload = uploadFile;
    this.s3Delete = deleteFile;
  }
  async uploadFile(dir, file) {
    const uploadFile = await this.s3Upload(dir, file);
    const { Location, Key, Bucket } = uploadFile;
    const localUrl = Location;
    const publicUrl = `${process.env.MINIO_PUBLIC_ENDPOINT}/${Bucket}/${Key}`;
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
}

export default new FileService();
