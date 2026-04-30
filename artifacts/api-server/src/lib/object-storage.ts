import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { isProduction } from "../config/env";

export type UploadKind = "profile" | "logo" | "banner" | "gallery";

export type ObjectStorageMode = "s3" | "cloudinary" | "none";

export type PutPublicObjectInput = {
  kind: UploadKind;
  originalName: string;
  body: Buffer;
  contentType: string;
};

function extensionFromName(name: string): string {
  const ext = path.extname(name || "").toLowerCase();
  if (ext && ext.length <= 8) return ext;
  return ".bin";
}

function getS3Config():
  | {
      client: S3Client;
      bucket: string;
      publicBaseUrl: string;
    }
  | null {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const region = process.env.S3_REGION?.trim() || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const explicitPublicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const publicBaseUrl = (
    explicitPublicBaseUrl
      ? explicitPublicBaseUrl
      : endpoint
        ? `${endpoint.replace(/\/$/, "")}/${bucket}`
        : `https://${bucket}.s3.${region}.amazonaws.com`
  ).replace(/\/$/, "");

  const client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    ...(endpoint ? { forcePathStyle: true } : {}),
  });

  return { client, bucket, publicBaseUrl };
}

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function parseCloudinaryUrl(raw: string): CloudinaryConfig | null {
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "cloudinary:") return null;

  const cloudName = parsed.hostname?.trim();
  const apiKey = decodeURIComponent(parsed.username || "").trim();
  const apiSecret = decodeURIComponent(parsed.password || "").trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function getCloudinaryConfig(): CloudinaryConfig | null {
  return parseCloudinaryUrl(process.env.CLOUDINARY_URL?.trim() || "");
}

export function getObjectStorageMode(): ObjectStorageMode {
  if (getCloudinaryConfig()) return "cloudinary";
  if (getS3Config()) return "s3";
  return "none";
}

async function putCloudinaryObject(input: PutPublicObjectInput): Promise<string> {
  const cfg = getCloudinaryConfig();
  if (!cfg) throw new Error("object_storage_not_configured");

  const ext = extensionFromName(input.originalName);
  const publicId = `nfc/${input.kind}/${randomUUID()}${ext.replace(".", "_")}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const signatureBase = `public_id=${publicId}&timestamp=${timestamp}${cfg.apiSecret}`;
  const signature = createHash("sha1").update(signatureBase).digest("hex");

  const endpoint = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`;
  const formData = new FormData();
  const fileBlob = new Blob([new Uint8Array(input.body)], { type: input.contentType });
  formData.append("file", fileBlob, input.originalName || "upload.bin");
  formData.append("public_id", publicId);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", cfg.apiKey);
  formData.append("signature", signature);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`cloudinary_upload_failed:${response.status}:${bodyText}`);
  }

  const json = (await response.json()) as { secure_url?: string };
  if (!json.secure_url) {
    throw new Error("cloudinary_upload_missing_secure_url");
  }
  return json.secure_url;
}

export async function putPublicObject(input: PutPublicObjectInput): Promise<string> {
  const mode = getObjectStorageMode();
  if (mode === "s3") {
    const cfg = getS3Config();
    if (!cfg) throw new Error("object_storage_not_configured");

    const ext = extensionFromName(input.originalName);
    const key = `nfc/${input.kind}/${randomUUID()}${ext}`;

    const putInput: PutObjectCommandInput = {
      Bucket: cfg.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    };

    await cfg.client.send(new PutObjectCommand(putInput));
    return `${cfg.publicBaseUrl}/${key}`;
  }
  if (mode === "cloudinary") {
    return putCloudinaryObject(input);
  }
  throw new Error("object_storage_not_configured");
}

export function assertCloudUploadConfigured(): void {
  if (!isProduction()) return;
  if (!getS3Config() && !getCloudinaryConfig()) {
    throw new Error(
      "Production upload storage is not configured. Set CLOUDINARY_URL (recommended) or S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and optional S3_PUBLIC_BASE_URL, S3_REGION, S3_ENDPOINT for R2.",
    );
  }
}
