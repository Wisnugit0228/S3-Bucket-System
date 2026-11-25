import express from "express";
import multer from "multer";
import {
  deleteFileController,
  downloadFileController,
  getFileUrlController,
  mergePdfPortfolioController,
  uploadFileController,
  viewFileController, // <-- 1. Import controller baru
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
      viewFile: {
        url: "/files/view",
        method: "GET",
        query: {
          key: "string",
          expires: "number",
          sig: "string",
        },
      },
    },
  });
});

router.post("/uploads", upload.single("file"), uploadFileController);
router.post("/delete", deleteFileController);
router.get("/download", downloadFileController);
router.get("/get-file", getFileUrlController);
router.get("/files/view", viewFileController);
router.post("/merge-portfolio", mergePdfPortfolioController);

export default router;