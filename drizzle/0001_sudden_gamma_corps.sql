CREATE TABLE "folder_path_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_id" uuid NOT NULL,
	"path" text NOT NULL,
	"provider_folder_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_folder_cache_bucket_path" UNIQUE("bucket_id","path")
);
--> statement-breakpoint
ALTER TABLE "folder_path_cache" ADD CONSTRAINT "folder_path_cache_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_folder_cache_bucket_id" ON "folder_path_cache" USING btree ("bucket_id");