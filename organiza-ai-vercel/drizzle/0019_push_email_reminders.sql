CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`endpointHash` varchar(64) NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscriptions_endpointHash_unique` UNIQUE(`endpointHash`)
);
--> statement-breakpoint
ALTER TABLE `user_profiles` MODIFY COLUMN `reminderChannel` enum('chat','email','push','both') NOT NULL DEFAULT 'chat';--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `remindersEnabled` boolean DEFAULT false NOT NULL;