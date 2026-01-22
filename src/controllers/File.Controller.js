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
