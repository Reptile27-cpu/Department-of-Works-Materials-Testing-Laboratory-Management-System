/*
  Warnings:

  - You are about to drop the column `created_at` on the `academic_years` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `classes` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `classes` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `fee_records` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `fee_records` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `marks` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `marks` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `report_cards` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `enrolled_date` on the `student_classes` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `subjects` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `terms` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `timetable_entries` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `classes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `fee_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `marks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `teachers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "timetable_entries" DROP CONSTRAINT "timetable_entries_class_id_fkey";

-- DropIndex
DROP INDEX "audit_logs_school_id_created_at_idx";

-- DropIndex
DROP INDEX "notifications_created_at_idx";

-- AlterTable
ALTER TABLE "academic_years" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "attendance" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "classes" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "fee_records" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "marks" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "report_cards" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "student_classes" DROP COLUMN "enrolled_date",
ADD COLUMN     "enrolledDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "subjects" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "terms" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "timetable_entries" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "email_otps" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "otp_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMPTZ,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_otps_user_id_created_at_idx" ON "email_otps"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_school_id_createdAt_idx" ON "audit_logs"("school_id", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
