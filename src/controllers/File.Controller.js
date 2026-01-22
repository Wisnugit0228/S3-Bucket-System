import FileService from "../services/File.service.js";

export const uploadFileController = async (req, res) => {
  try {
    if (!req.body.dir || !req.file) {
      throw new Error("dir and file is required");
    }
    const { dir } = req.body;
    const file = req.file;
    const uploadFile = await FileService.uploadFile(dir, file);
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
    if (!req.body.key) {
      throw new Error("key is required");
    }
    const { key } = req.body;
    const deleteFile = await FileService.deleteFile(key);
    res.status(200).json({
      status: "success",
      data: deleteFile,
    });
  } catch (error) {
    res.status(500).json({
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

    res.setHeader("Content-Type", file.ContentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${key.split("/").pop()}"`,
    );

    return res.send(file.Body); // buffer
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const listFoldersController = async (req, res) => {
  try {
    const { prefix } = req.query;

    const folders = await FileService.listFolders(prefix || "");

    res.status(200).json({
      status: "success",
      total: folders.length,
      data: folders,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const listFilesController = async (req, res) => {
  try {
    const { prefix } = req.query;

    if (!prefix) {
      return res.status(400).json({
        status: "error",
        message: "prefix is required",
      });
    }

    const files = await FileService.getFileByFolder(prefix);

    res.status(200).json({
      status: "success",
      folder: prefix,
      total: files.length,
      data: files.map((file) => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
      })),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
