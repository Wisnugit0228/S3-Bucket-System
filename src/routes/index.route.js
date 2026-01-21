import express from "express";
import multer from "multer";
import {
  deleteFileController,
  uploadFileController,
} from "../controllers/File.Controller.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", (req, res) => {
  res.send("Hello World!");
});

router.post("/uploads", upload.single("file"), uploadFileController);
router.post("/delete", deleteFileController);

export default router;
