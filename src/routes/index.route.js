import express from "express";
import multer from "multer";
import {
  deleteFileController,
  downloadFileController,
  listFilesController,
  listFoldersController,
  uploadFileController,
} from "../controllers/File.Controller.js";
import { listObjectsByPrefix } from "../services/Bucket.service.js";

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
    },
  });
});

router.post("/uploads", upload.single("file"), uploadFileController);
router.post("/delete", deleteFileController);
router.get("/download", downloadFileController);

router.get("/folders", listFoldersController);
router.get("/filefolder", listFilesController);

export default router;
