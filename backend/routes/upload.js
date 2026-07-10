import express from "express";
import multer from "multer";
import cloudinary from "../cloudinary.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage()
});

router.post("/", auth, upload.single("image"), async (req, res) => {
    const result = await new Promise(
      (resolve, reject) => {

      cloudinary.uploader.upload_stream(
        {
          folder: "tenanttrails"
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({
      url: result.secure_url
    });
});

export default router;