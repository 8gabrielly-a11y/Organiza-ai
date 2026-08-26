CREATE TABLE `planner_routines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int,
	`title` varchar(220) NOT NULL,
	`daysOfWeek` varchar(32) NOT NULL,
	`startMinute` int NOT NULL,
	`endMinute` int NOT NULL,
	`commuteBeforeMinutes` int NOT NULL DEFAULT 0,
	`commuteAfterMinutes` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planner_routines_id` PRIMARY KEY(`id`)
);
