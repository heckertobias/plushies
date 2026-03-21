CREATE TABLE `plushies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`birthday` text NOT NULL,
	`origin` text,
	`notes` text,
	`photo_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
