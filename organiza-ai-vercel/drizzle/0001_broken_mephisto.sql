CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planner_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`color` varchar(24) NOT NULL DEFAULT 'sage',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `planner_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planner_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`notes` text,
	`kind` enum('task','appointment','update') NOT NULL DEFAULT 'task',
	`status` enum('planned','completed','skipped') NOT NULL DEFAULT 'planned',
	`plannedAt` bigint NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 30,
	`sourceMessageId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planner_items_id` PRIMARY KEY(`id`)
);
