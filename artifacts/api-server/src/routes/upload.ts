import { Router, type IRouter } from "express";
import multer from "multer";
import { sendJsonError } from "../lib/errors";
import { logger } from "../lib/logger";
import {
  getObjectStorageMode,
  putPublicObject,
  type UploadKind,
} from "../lib/object-storage";

const router: IRouter = Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function normalizeKind(raw: string): UploadKind | null {
  const k = String(raw ?? "profile").trim().toLowerCase();
  if (k === "logo" || k === "banner" || k === "gallery" || k === "profile") {
    return k;
  }
  return null;
}

router.post(
  "/upload",
  memoryUpload.single("file"),
  async (req, res): Promise<void> => {
    const kind = normalizeKind(String(req.query.type ?? "profile"));
    if (!kind) {
      sendJsonError(
        res,
        400,
        "Invalid upload type. Supported values: profile, logo, banner, gallery.",
        { code: "INVALID_UPLOAD_TYPE" },
      );
      return;
    }

    if (!req.file?.buffer) {
      sendJsonError(res, 400, "file is required", { code: "FILE_REQUIRED" });
      return;
    }

    const contentType =
      req.file.mimetype && req.file.mimetype !== "application/octet-stream"
        ? req.file.mimetype
        : "application/octet-stream";

    if (!contentType.startsWith("image/")) {
      sendJsonError(res, 400, "Only image files are allowed", {
        code: "UNSUPPORTED_MEDIA_TYPE",
      });
      return;
    }

    const mode = getObjectStorageMode();

    if (mode === "s3" || mode === "cloudinary") {
      try {
        const url = await putPublicObject({
          kind,
          originalName: req.file.originalname || "upload",
          body: req.file.buffer,
          contentType,
        });
        res.status(201).json({
          ok: true,
          kind,
          provider: mode,
          url,
          message: "Upload successful",
        });
        return;
      } catch (err) {
        logger.error({ err, kind, mode }, "Cloud upload failed");
        sendJsonError(
          res,
          502,
          "Failed to upload image to cloud storage",
          {
            code: "STORAGE_UPLOAD_FAILED",
            details: {
              provider: mode,
              kind,
            },
          },
        );
        return;
      }
    }

    sendJsonError(
      res,
      503,
      "File storage is not configured. Set CLOUDINARY_URL (recommended) or S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, optional S3_PUBLIC_BASE_URL, and S3_ENDPOINT for R2.",
      { code: "STORAGE_NOT_CONFIGURED" },
    );
  },
);

export default router;
