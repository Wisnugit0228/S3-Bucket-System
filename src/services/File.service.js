import {
  deleteFile,
  downloadFile,
  listFolders,
  listObjectsByPrefix,
  uploadFile,
} from "./Bucket.service.js";

class FileService {
  constructor() {
    this.s3Upload = uploadFile;
    this.s3Delete = deleteFile;
    this.s3Download = downloadFile;
    this.s3GetFolders = listFolders;
    this.s3getFileByFolder = listObjectsByPrefix;
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

  async listFolders(prefix = "") {
    const folders = await this.s3GetFolders(prefix);
    return folders;
  }

  async getFileByFolder(prefix) {
    const files = await this.s3getFileByFolder(prefix);
    return files;
  }
}

export default new FileService();
