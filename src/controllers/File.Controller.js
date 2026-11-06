import FileService from "../services/File.service.js";

export const uploadFileController = async (req, res) => {
  try {
    if (!req.body.directory || !req.file) {
      throw new Error("directory and file is required");
    }
    if (!req.body.bucketName) {
      throw new Error("bucketName is required");
    }
    const { directory, bucketName } = req.body;
    const file = req.file;
    const uploadFile = await FileService.uploadFile(
      bucketName,
      directory,
      file,
    );
    res.status(200).json({
      status: "success",
      data: uploadFile,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const deleteFileController = async (req, res) => {
  try {
    // Membaca key dari req.body ATAU req.query
    const key = req.body?.key || req.query?.key;

    if (!key) {
      return res.status(400).json({
        status: "error",
        message: "key is required",
      });
    }

    const deleteFile = await FileService.deleteFile(key);
    return res.status(200).json({
      status: "success",
      data: deleteFile,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const downloadFileController = async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        status: "error",
        message: "key is required",
      });
    }

    const file = await FileService.downloadFile(key);

    // 1. Ekstrak nama file untuk Content-Disposition header
    const fileName = key.split("/").pop();

    // 2. Set Response Headers
    if (file.ContentType) {
      res.setHeader("Content-Type", file.ContentType);
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    // 3. Konversi AWS SDK v3 stream (file.Body) ke Buffer
    const byteArray = await file.Body.transformToByteArray();
    const buffer = Buffer.from(byteArray);

    return res.send(buffer);
  } catch (error) {
    console.error("Download file error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getFileUrlController = async (req, res) => {
  try {
    const { key, bucketName, expiresIn } = req.query;

    if (!key) {
      return res.status(400).json({
        status: "error",
        message: "key is required",
      });
    }

    const url = await FileService.getFileUrl(
      key,
      bucketName,
      expiresIn ? parseInt(expiresIn, 10) : 3600,
    );

    return res.status(200).json({
      status: "success",
      data: { url },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};