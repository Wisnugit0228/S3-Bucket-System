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
