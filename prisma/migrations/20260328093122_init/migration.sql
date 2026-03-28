-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GENERATOR', 'RECEIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "WasteCategory" AS ENUM ('ORGANIC', 'WOOD', 'OIL', 'PLASTIC', 'PAPER', 'METAL', 'OTHER');

-- CreateEnum
CREATE TYPE "WasteStatus" AS ENUM ('AVAILABLE', 'MATCHED', 'COLLECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING_APPROVAL', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'GENERATOR',
    "address_text" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wastes" (
    "id" TEXT NOT NULL,
    "generator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "WasteCategory" NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "image_url" TEXT,
    "pickup_instructions" TEXT,
    "status" "WasteStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wastes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "waste_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "actual_distance_km" DOUBLE PRECISION,
    "driving_time_mins" INTEGER,
    "carbon_saved_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "match_status" "MatchStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "matches_waste_id_key" ON "matches"("waste_id");

-- AddForeignKey
ALTER TABLE "wastes" ADD CONSTRAINT "wastes_generator_id_fkey" FOREIGN KEY ("generator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_waste_id_fkey" FOREIGN KEY ("waste_id") REFERENCES "wastes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
