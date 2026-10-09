-- Add an explicit purpose so verification and password-reset OTPs cannot be interchanged.
ALTER TABLE "email_otps"
ADD COLUMN "purpose" VARCHAR(32) NOT NULL DEFAULT 'email_verification';

DROP INDEX "email_otps_user_id_created_at_idx";

CREATE INDEX "email_otps_user_id_purpose_created_at_idx"
ON "email_otps"("user_id", "purpose", "created_at" DESC);
