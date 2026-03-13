CREATE TABLE "distribution" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	CONSTRAINT "distribution_product_store_uq" UNIQUE("product_id","store_id")
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"week_start" date NOT NULL,
	"units" integer NOT NULL,
	"revenue" numeric(10, 2) NOT NULL,
	CONSTRAINT "forecasts_product_week_uq" UNIQUE("product_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ean" text,
	"pack_size" text,
	"rrp" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "risks_and_opps" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"date" date NOT NULL,
	"units" integer NOT NULL,
	"revenue" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"format" text NOT NULL,
	CONSTRAINT "stores_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"week_start" date NOT NULL,
	"units" integer NOT NULL,
	"revenue" numeric(10, 2) NOT NULL,
	CONSTRAINT "targets_product_week_uq" UNIQUE("product_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks_and_opps" ADD CONSTRAINT "risks_and_opps_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_product_store_date_idx" ON "sales" USING btree ("product_id","store_id","date");--> statement-breakpoint
CREATE INDEX "sales_date_idx" ON "sales" USING btree ("date");