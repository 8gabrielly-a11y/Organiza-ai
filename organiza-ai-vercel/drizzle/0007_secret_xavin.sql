CREATE TABLE `planner_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plannerItemId` int,
	`kind` varchar(48) NOT NULL,
	`dedupeKey` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `planner_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `planner_notifications_dedupeKey_unique` UNIQUE(`dedupeKey`)
);
--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `reminderScheduleUid` varchar(96);