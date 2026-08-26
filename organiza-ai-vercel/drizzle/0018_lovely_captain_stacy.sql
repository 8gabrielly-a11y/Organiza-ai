ALTER TABLE `user_profiles` ADD `reminderChannel` enum('chat','email') DEFAULT 'chat' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `reminderLeadMinutes` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `quietHoursStartMinute` int DEFAULT 1320 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `quietHoursEndMinute` int DEFAULT 420 NOT NULL;