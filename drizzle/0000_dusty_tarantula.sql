CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"name" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"bucket_restriction" uuid,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider_folder_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_buckets_name_user" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "object_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"provider_file_id" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"etag" text NOT NULL,
	"version_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_id" uuid NOT NULL,
	"key" text NOT NULL,
	"provider_file_id" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"content_type" text NOT NULL,
	"etag" text NOT NULL,
	"current_version_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_objects_bucket_key" UNIQUE("bucket_id","key")
);
--> statement-breakpoint
CREATE TABLE "signed_url_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"provider_account_email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bucket_id" uuid NOT NULL,
	"api_key_id" uuid,
	"operation" text NOT NULL,
	"bytes_transferred" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_bucket_restriction_buckets_id_fk" FOREIGN KEY ("bucket_restriction") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buckets" ADD CONSTRAINT "buckets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buckets" ADD CONSTRAINT "buckets_connection_id_storage_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."storage_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_versions" ADD CONSTRAINT "object_versions_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objects" ADD CONSTRAINT "objects_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_url_grants" ADD CONSTRAINT "signed_url_grants_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_connections" ADD CONSTRAINT "storage_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_api_keys_user_id" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_buckets_user_id" ON "buckets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_buckets_connection_id" ON "buckets" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_obj_versions_object_id" ON "object_versions" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "idx_objects_bucket_key" ON "objects" USING btree ("bucket_id","key");--> statement-breakpoint
CREATE INDEX "idx_objects_bucket_id" ON "objects" USING btree ("bucket_id");--> statement-breakpoint
CREATE INDEX "idx_signed_urls_object_id" ON "signed_url_grants" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "idx_connections_user_id" ON "storage_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_usage_logs_user_created" ON "usage_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_usage_logs_user_id" ON "usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_usage_logs_bucket_id" ON "usage_logs" USING btree ("bucket_id");