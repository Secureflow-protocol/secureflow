import { Router } from "express";
import multer from "multer";
import { getSupabase } from "../lib/supabase.js";
import { internalError, serviceUnavailable } from "../lib/errors.js";
import { uploadMilestoneBody } from "../schemas/upload.js";

export const uploadRouter = Router();

const BUCKET = "milestone-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

uploadRouter.post("/milestone", upload.single("file"), async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    serviceUnavailable(res, "Storage");
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const bodyResult = uploadMilestoneBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({
      error: "Validation failed",
      details: bodyResult.error.errors.map((e) => ({
        field: e.path.join(".") || "root",
        message: e.message,
      })),
    });
    return;
  }

  const escrowId = String(bodyResult.data.escrow_id);
  const milestoneIndex = String(bodyResult.data.milestone_index);
  const ext = file.originalname.split(".").pop() ?? "bin";
  const path = `${escrowId}/${milestoneIndex}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  // Ensure bucket exists (idempotent – ignore "already exists" errors)
  await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
    fileSizeLimit: MAX_FILE_SIZE,
  });

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true, // upsert=true avoids duplicate-key errors on retry
    });

  if (uploadError) {
    internalError(res);
    return;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  res.status(201).json({
    url: publicUrl,
    filename: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  });
});
