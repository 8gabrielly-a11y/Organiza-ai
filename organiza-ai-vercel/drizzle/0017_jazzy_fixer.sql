CREATE TABLE `planner_routine_exceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`routineId` int NOT NULL,
	`dateKey` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `planner_routine_exceptions_id` PRIMARY KEY(`id`)
);
