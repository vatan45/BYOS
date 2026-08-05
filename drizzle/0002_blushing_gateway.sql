ALTER TABLE "signed_url_grants" ALTER COLUMN "object_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signed_url_grants" ADD COLUMN "bucket_id" uuid;--> statement-breakpoint
ALTER TABLE "signed_url_grants" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "signed_url_grants" ADD COLUMN "operation" text DEFAULT 'get' NOT NULL;--> statement-breakpoint
ALTER TABLE "signed_url_grants" ADD COLUMN "signature" text;--> statement-breakpoint
ALTER TABLE "signed_url_grants" ADD COLUMN "max_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "signed_url_grants" ADD CONSTRAINT "signed_url_grants_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_signed_urls_signature" ON "signed_url_grants" USING btree ("signature");