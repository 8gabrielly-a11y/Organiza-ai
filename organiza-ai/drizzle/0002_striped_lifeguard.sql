CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`onboardingComplete` int NOT NULL DEFAULT 0,
	`communicationTone` enum('gentle','balanced','direct') NOT NULL DEFAULT 'balanced',
	`preferredName` varchar(120),
	`email` varchar(320),
	`geminiKeyEncrypted` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
