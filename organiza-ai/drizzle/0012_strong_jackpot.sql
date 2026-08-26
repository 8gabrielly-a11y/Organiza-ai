CREATE TABLE `user_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('suggestion','problem','compliment','other') NOT NULL DEFAULT 'suggestion',
	`message` text NOT NULL,
	`status` enum('new','read') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_feedback_id` PRIMARY KEY(`id`)
);
