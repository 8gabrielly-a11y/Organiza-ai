CREATE TABLE `calendar_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'google',
	`accessTokenEncrypted` text,
	`refreshTokenEncrypted` text,
	`expiresAt` bigint,
	`calendarId` varchar(320) DEFAULT 'primary',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `calendar_connections_userId_unique` UNIQUE(`userId`)
);
