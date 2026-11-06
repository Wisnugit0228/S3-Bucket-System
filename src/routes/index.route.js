import express from "express";
import multer from "multer";
import {
  deleteFileController,
  downloadFileController,
  getFileUrlController,
  uploadFileController,
} from "../controllers/File.Controller.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    endpoint: {
      uploadFile: {
        url: "/uploads",
        method: "POST",
        body: {
          dir: "string",
          file: "file",
        },
      },
      dowloadFile: {
        url: "/download",
        method: "GET",
        query: {
          key: "string",
        },
      },
      getFileUrl: {
        url: "/get-file",
        method: "GET",
        query: {
          key: "string",
          bucketName: "string (optional)",
          expiresIn: "number (optional, default 3600)",
        },
      },
    },
  });
});

router.post("/uploads", upload.single("file"), uploadFileController);
router.post("/delete", deleteFileController);
router.get("/download", downloadFileController);
router.get("/get-file", getFileUrlController);

export default router;