CREATE TABLE "memory_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"relation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"memory_type" text NOT NULL,
	"importance" integer DEFAULT 5,
	"source_file" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traces" (
	"id" text PRIMARY KEY NOT NULL,
	"trace_type" text NOT NULL,
	"method" text,
	"path" text,
	"status" integer,
	"duration_ms" integer,
	"meta" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_edges" ADD CONSTRAINT "memory_edges_from_id_memory_nodes_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."memory_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_edges" ADD CONSTRAINT "memory_edges_to_id_memory_nodes_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."memory_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mn_type_idx" ON "memory_nodes" USING btree ("memory_type");--> statement-breakpoint
CREATE INDEX "tr_created_idx" ON "traces" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tr_type_idx" ON "traces" USING btree ("trace_type");