-- MySQL dump 10.16  Distrib 10.1.26-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: LootBot
-- ------------------------------------------------------
-- Server version	10.1.26-MariaDB-0+deb9u1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ability`
--

DROP TABLE IF EXISTS `ability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ability` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL DEFAULT '0',
  `ability_id` int(11) NOT NULL DEFAULT '0',
  `ability_level` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ability_no_duplicate` (`player_id`,`ability_id`),
  KEY `ability_id` (`ability_id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `ABILITY_PID` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ability_id_list` FOREIGN KEY (`ability_id`) REFERENCES `ability_list` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ability_list`
--

DROP TABLE IF EXISTS `ability_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ability_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `description` varchar(255) NOT NULL,
  `prev` int(1) NOT NULL DEFAULT '0',
  `val` int(11) NOT NULL DEFAULT '0',
  `det` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `achievement_daily`
--

DROP TABLE IF EXISTS `achievement_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `achievement_daily` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `achievement_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `achievement_id` (`achievement_id`),
  CONSTRAINT `ACHID` FOREIGN KEY (`achievement_id`) REFERENCES `achievement_list` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `achievement_global`
--

DROP TABLE IF EXISTS `achievement_global`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `achievement_global` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `value` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`) USING BTREE,
  CONSTRAINT `PLAYERID_GLOBAL` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `achievement_list`
--

DROP TABLE IF EXISTS `achievement_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `achievement_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `det` varchar(128) NOT NULL,
  `value` int(11) NOT NULL,
  `item_rarity` int(11) NOT NULL DEFAULT '0',
  `reward` int(11) NOT NULL DEFAULT '0',
  `type` int(11) NOT NULL,
  `multiply` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `achievement_progressive_status`
--

DROP TABLE IF EXISTS `achievement_progressive_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `achievement_progressive_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `subtype` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `type` (`type`),
  CONSTRAINT `PLAYERID_PROGR` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `achievement_status`
--

DROP TABLE IF EXISTS `achievement_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `achievement_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `achievement_id` int(11) NOT NULL,
  `progress` int(11) NOT NULL DEFAULT '0',
  `completed` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `achievement_no_duplicate` (`player_id`,`achievement_id`),
  KEY `player_id` (`player_id`),
  KEY `achievement_id` (`achievement_id`),
  CONSTRAINT `PID_STATS` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `STAT_PROGR` FOREIGN KEY (`achievement_id`) REFERENCES `achievement_list` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `active_history`
--

DROP TABLE IF EXISTS `active_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `active_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `count` int(11) NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artifacts`
--

DROP TABLE IF EXISTS `artifacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `artifacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `get_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `ITEMID_ART` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_ART` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assault`
--

DROP TABLE IF EXISTS `assault`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assault` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL,
  `phase` tinyint(1) NOT NULL DEFAULT '0',
  `time_end` timestamp NULL DEFAULT NULL,
  `time_wait_end` timestamp NULL DEFAULT NULL,
  `completed` int(11) NOT NULL DEFAULT '0',
  `lost` int(11) NOT NULL DEFAULT '0',
  `mob_name` varchar(32) DEFAULT NULL,
  `mob_life` int(11) NOT NULL DEFAULT '0',
  `mob_total_life` int(11) NOT NULL DEFAULT '0',
  `mob_paralyzed` int(11) NOT NULL DEFAULT '0',
  `mob_critic` int(11) NOT NULL DEFAULT '0',
  `mob_count` int(11) NOT NULL DEFAULT '0',
  `refresh_mob` tinyint(1) NOT NULL DEFAULT '0',
  `is_boss` tinyint(1) NOT NULL DEFAULT '0',
  `boss_num` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_id` (`team_id`),
  CONSTRAINT `assault_team_id` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assault_place`
--

DROP TABLE IF EXISTS `assault_place`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assault_place` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `class_bonus` varchar(16) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assault_place_cons`
--

DROP TABLE IF EXISTS `assault_place_cons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assault_place_cons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `qnt` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `cons_player_id` (`player_id`),
  KEY `cons_team_id` (`team_id`),
  KEY `cons_item_id` (`item_id`),
  CONSTRAINT `cons_item_id` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cons_player_id` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cons_team_id` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assault_place_item`
--

DROP TABLE IF EXISTS `assault_place_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assault_place_item` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL,
  `place_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_place_no_duplicate` (`team_id`,`place_id`),
  KEY `item_pool_sel_place_id` (`place_id`),
  KEY `item_pool_sel_item_id` (`item_id`),
  CONSTRAINT `item_pool_sel_item_id` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE,
  CONSTRAINT `item_pool_sel_place_id` FOREIGN KEY (`place_id`) REFERENCES `assault_place` (`id`) ON DELETE CASCADE,
  CONSTRAINT `item_pool_sel_team_id` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assault_place_magic`
--

DROP TABLE IF EXISTS `assault_place_magic`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assault_place_magic` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `power` int(11) NOT NULL,
  `qnt` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `magic_player_id` (`player_id`),
  KEY `magic_team_id` (`team_id`),
  KEY `magic_magic_id` (`type`),
  CONSTRAINT `magic_magic_id` FOREIGN KEY (`type`) REFERENCES `mana` (`id`) ON DELETE CASCADE,
  CONSTRAINT `magic_player_id` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assault_place_player_id`
--

DROP TABLE IF EXISTS `assault_place_player_id`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assault_place_player_id` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `place_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `place_place_no_duplicate` (`place_id`,`player_id`),
  KEY `place_user_player_id` (`player_id`),
  CONSTRAINT `place_user_place_id` FOREIGN KEY (`place_id`) REFERENCES `assault_place` (`id`) ON DELETE CASCADE,
  CONSTRAINT `place_user_player_id` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assault_place_team`
--

DROP TABLE IF EXISTS `assault_place_team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assault_place_team` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `place_id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `level` int(11) NOT NULL,
  `time_end` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `place_team_no_duplicate` (`place_id`,`team_id`),
  KEY `place_team_team_id` (`team_id`),
  CONSTRAINT `place_team_place_id` FOREIGN KEY (`place_id`) REFERENCES `assault_place` (`id`) ON DELETE CASCADE,
  CONSTRAINT `place_team_team_id` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auction_history`
--

DROP TABLE IF EXISTS `auction_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auction_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creator_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `creator_id` (`creator_id`),
  KEY `player_id` (`player_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `CREATORID_AUCT` FOREIGN KEY (`creator_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ITEMID_AUCT` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_AUCT` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auction_list`
--

DROP TABLE IF EXISTS `auction_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auction_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` bigint(32) NOT NULL,
  `creator_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `last_price` int(11) NOT NULL DEFAULT '0',
  `last_player` int(11) NOT NULL DEFAULT '0',
  `time_end` text,
  `time_start` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `last_player` (`last_player`),
  KEY `creator_id` (`creator_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `CREATORID_AU` FOREIGN KEY (`creator_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ITEMID_AU` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `auction_public`
--

DROP TABLE IF EXISTS `auction_public`;
/*!50001 DROP VIEW IF EXISTS `auction_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `auction_public` (
  `id` tinyint NOT NULL,
  `creator` tinyint NOT NULL,
  `player` tinyint NOT NULL,
  `item` tinyint NOT NULL,
  `price` tinyint NOT NULL,
  `time` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `banlist`
--

DROP TABLE IF EXISTS `banlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `banlist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` bigint(16) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `until` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `boss`
--

DROP TABLE IF EXISTS `boss`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `boss` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `total_life` int(16) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `boss_damage`
--

DROP TABLE IF EXISTS `boss_damage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `boss_damage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boss_id` int(3) NOT NULL,
  `player_id` int(3) NOT NULL,
  `team_id` int(11) NOT NULL,
  `damage` int(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `boss_id` (`boss_id`),
  KEY `player_id` (`player_id`),
  KEY `team_id` (`team_id`),
  CONSTRAINT `BOSSID_TEAM` FOREIGN KEY (`boss_id`) REFERENCES `boss_team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_BOSST` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TEAMID_BOSST` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `boss_damage_view`
--

DROP TABLE IF EXISTS `boss_damage_view`;
/*!50001 DROP VIEW IF EXISTS `boss_damage_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `boss_damage_view` (
  `notification` tinyint NOT NULL,
  `nickname` tinyint NOT NULL,
  `player_id` tinyint NOT NULL,
  `chat_id` tinyint NOT NULL,
  `damage` tinyint NOT NULL,
  `boss_id` tinyint NOT NULL,
  `team_id` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `boss_team`
--

DROP TABLE IF EXISTS `boss_team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `boss_team` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boss_id` int(11) NOT NULL,
  `life` int(11) NOT NULL,
  `total_life` int(11) NOT NULL,
  `killedby` varchar(64) DEFAULT NULL,
  `killeddate` timestamp NULL DEFAULT NULL,
  `unlocked` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `paralyzed` int(11) NOT NULL DEFAULT '0',
  `critic` int(11) NOT NULL DEFAULT '0',
  `countdown` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `TEAMID` (`team_id`),
  KEY `boss_id` (`boss_id`),
  CONSTRAINT `BOSSID_TEAML` FOREIGN KEY (`boss_id`) REFERENCES `boss` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `team_id_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cave`
--

DROP TABLE IF EXISTS `cave`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cave` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `duration` int(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chest`
--

DROP TABLE IF EXISTS `chest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chest` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) NOT NULL,
  `rarity_shortname` varchar(3) NOT NULL,
  `value` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rarity_shortname` (`rarity_shortname`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `class`
--

DROP TABLE IF EXISTS `class`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `class` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `code_list`
--

DROP TABLE IF EXISTS `code_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `code_list` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `code` varchar(16) NOT NULL,
  `used` varchar(32) NOT NULL,
  `chest_id` int(3) NOT NULL DEFAULT '0',
  `money` int(8) NOT NULL DEFAULT '0',
  `gems` int(11) NOT NULL DEFAULT '0',
  `item_id` int(3) NOT NULL DEFAULT '0',
  `nickname` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQUE` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `config`
--

DROP TABLE IF EXISTS `config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `global_eventon` int(11) NOT NULL DEFAULT '0',
  `global_eventwait` int(11) NOT NULL DEFAULT '0' COMMENT 'Raccogliendo dati',
  `global_eventhide` int(11) NOT NULL DEFAULT '0' COMMENT 'Cap non visibile',
  `global_cap` bigint(32) NOT NULL DEFAULT '1000',
  `global_item1` int(11) NOT NULL DEFAULT '0',
  `global_item2` int(11) NOT NULL DEFAULT '0',
  `global_item3` int(11) NOT NULL,
  `food` int(11) NOT NULL DEFAULT '0',
  `global_msg` text NOT NULL,
  `global_msg_on` int(2) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contest`
--

DROP TABLE IF EXISTS `contest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_CONTEST` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `craft`
--

DROP TABLE IF EXISTS `craft`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `craft` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `material_1` int(3) NOT NULL,
  `material_2` int(3) NOT NULL,
  `material_3` int(3) NOT NULL,
  `material_result` int(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `MAT1` (`material_1`),
  KEY `MAT2` (`material_2`),
  KEY `MAT3` (`material_3`),
  KEY `MATR` (`material_result`),
  CONSTRAINT `material_1_item` FOREIGN KEY (`material_1`) REFERENCES `item` (`id`),
  CONSTRAINT `material_2_item` FOREIGN KEY (`material_2`) REFERENCES `item` (`id`),
  CONSTRAINT `material_3_item` FOREIGN KEY (`material_3`) REFERENCES `item` (`id`),
  CONSTRAINT `material_r_item` FOREIGN KEY (`material_result`) REFERENCES `item` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `craft_public`
--

DROP TABLE IF EXISTS `craft_public`;
/*!50001 DROP VIEW IF EXISTS `craft_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `craft_public` (
  `id` tinyint NOT NULL,
  `material_1` tinyint NOT NULL,
  `material_2` tinyint NOT NULL,
  `material_3` tinyint NOT NULL,
  `material_result` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `craft_public_id`
--

DROP TABLE IF EXISTS `craft_public_id`;
/*!50001 DROP VIEW IF EXISTS `craft_public_id`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `craft_public_id` (
  `id` tinyint NOT NULL,
  `material_1` tinyint NOT NULL,
  `material_2` tinyint NOT NULL,
  `material_3` tinyint NOT NULL,
  `material_result` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `daily_chest`
--

DROP TABLE IF EXISTS `daily_chest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `daily_chest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `chest_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `chest_id` (`chest_id`),
  CONSTRAINT `CHESTID_DAILY` FOREIGN KEY (`chest_id`) REFERENCES `chest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_DAILY` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `direct_message`
--

DROP TABLE IF EXISTS `direct_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `direct_message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `allow` int(11) NOT NULL DEFAULT '1',
  `to_id` int(11) NOT NULL DEFAULT '0',
  `reply_text` text,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `to_id` (`to_id`),
  CONSTRAINT `PLAYERID_DIRECT` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_TOID` FOREIGN KEY (`to_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `donation_history`
--

DROP TABLE IF EXISTS `donation_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `donation_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `amount` decimal(9,2) NOT NULL,
  `source` varchar(16) NOT NULL COMMENT 'Telegram / Paypal',
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `player_id_donation` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon`
--

DROP TABLE IF EXISTS `dragon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `player_id` int(3) NOT NULL DEFAULT '0',
  `name` text NOT NULL,
  `exp` int(11) NOT NULL,
  `level` int(8) NOT NULL DEFAULT '0',
  `life` int(11) NOT NULL DEFAULT '0',
  `total_life` int(11) NOT NULL DEFAULT '0',
  `scale` int(11) NOT NULL DEFAULT '0',
  `sleep_time_end` timestamp NULL DEFAULT NULL,
  `sleep_h` int(11) NOT NULL DEFAULT '0',
  `damage` int(8) NOT NULL DEFAULT '0',
  `defence` int(8) NOT NULL DEFAULT '0',
  `critical` int(11) NOT NULL DEFAULT '0',
  `claws_id` int(3) NOT NULL DEFAULT '0',
  `claws` int(3) NOT NULL DEFAULT '0',
  `saddle_id` int(3) NOT NULL DEFAULT '0',
  `saddle` int(3) NOT NULL DEFAULT '0',
  `arms_id` int(11) NOT NULL DEFAULT '0',
  `arms_duration` int(11) NOT NULL DEFAULT '0',
  `type` varchar(32) DEFAULT NULL,
  `boost_time` timestamp NULL DEFAULT NULL,
  `boost_id` int(11) NOT NULL DEFAULT '0',
  `evolved` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `PLAYERID` (`player_id`),
  KEY `type` (`type`),
  CONSTRAINT `dragon_player_id` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon_dummy`
--

DROP TABLE IF EXISTS `dragon_dummy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon_dummy` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `exp` int(11) NOT NULL,
  `level` int(8) NOT NULL DEFAULT '0',
  `life` int(11) NOT NULL DEFAULT '0',
  `total_life` int(11) NOT NULL DEFAULT '0',
  `scale` int(11) NOT NULL DEFAULT '0',
  `damage` int(8) NOT NULL DEFAULT '0',
  `defence` int(8) NOT NULL DEFAULT '0',
  `critical` int(11) NOT NULL DEFAULT '0',
  `claws_id` int(3) NOT NULL DEFAULT '0',
  `claws` int(3) NOT NULL DEFAULT '0',
  `saddle_id` int(3) NOT NULL DEFAULT '0',
  `saddle` int(3) NOT NULL DEFAULT '0',
  `arms_id` int(11) NOT NULL DEFAULT '0',
  `arms_duration` int(11) NOT NULL DEFAULT '5',
  `type` varchar(32) DEFAULT NULL,
  `evolved` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon_move`
--

DROP TABLE IF EXISTS `dragon_move`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon_move` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `scale` int(11) NOT NULL DEFAULT '0',
  `damage` decimal(3,2) NOT NULL DEFAULT '0.00' COMMENT 'In %',
  `move_type` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `move_type` (`move_type`),
  KEY `scale` (`scale`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon_name_list`
--

DROP TABLE IF EXISTS `dragon_name_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon_name_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon_top_dummy`
--

DROP TABLE IF EXISTS `dragon_top_dummy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon_top_dummy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dragon_id` int(11) NOT NULL,
  `top_id` int(11) NOT NULL DEFAULT '0',
  `enemy_dragon_id` int(11) DEFAULT NULL,
  `poison` int(11) NOT NULL DEFAULT '0' COMMENT 'Veleno',
  `protection` int(11) NOT NULL DEFAULT '0' COMMENT 'Protezione',
  `dmg_boost` int(11) NOT NULL DEFAULT '0' COMMENT 'Danno aumentato',
  `confusion` int(11) NOT NULL DEFAULT '0' COMMENT 'Confuso',
  `wait_dmg` int(11) NOT NULL DEFAULT '0' COMMENT 'Colpo caricato',
  `ice` int(11) NOT NULL DEFAULT '0' COMMENT 'Congelamento',
  `battle_time` timestamp NULL DEFAULT NULL,
  `no_match_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dragon_id` (`dragon_id`),
  CONSTRAINT `DRAGONID_VETTAD` FOREIGN KEY (`dragon_id`) REFERENCES `dragon_dummy` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon_top_list`
--

DROP TABLE IF EXISTS `dragon_top_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon_top_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `pnt` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon_top_log`
--

DROP TABLE IF EXISTS `dragon_top_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon_top_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `dragon_id` int(11) NOT NULL,
  `enemy_player_id` int(11) NOT NULL,
  `enemy_dragon_id` int(11) NOT NULL,
  `win` int(11) NOT NULL DEFAULT '0',
  `note` varchar(64) NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `player_visible` int(11) NOT NULL DEFAULT '1',
  `enemy_visible` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `dragon_id` (`dragon_id`),
  KEY `enemy_player_id` (`enemy_player_id`),
  KEY `enemy_dragon_id` (`enemy_dragon_id`),
  CONSTRAINT `dragongist_dragon` FOREIGN KEY (`dragon_id`) REFERENCES `dragon` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dragongist_enemy_dragon` FOREIGN KEY (`enemy_dragon_id`) REFERENCES `dragon` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dragonhist_enemy_player` FOREIGN KEY (`enemy_player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dragonhist_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon_top_rank`
--

DROP TABLE IF EXISTS `dragon_top_rank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon_top_rank` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `dragon_id` int(11) NOT NULL,
  `top_id` int(11) NOT NULL,
  `rank` int(11) NOT NULL DEFAULT '0',
  `combat` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  UNIQUE KEY `dragon_id` (`dragon_id`),
  KEY `top_id` (`top_id`),
  CONSTRAINT `DRAGONID_RANK` FOREIGN KEY (`dragon_id`) REFERENCES `dragon` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_RANK` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TOPID_LIST` FOREIGN KEY (`top_id`) REFERENCES `dragon_top_list` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dragon_top_status`
--

DROP TABLE IF EXISTS `dragon_top_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dragon_top_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `is_dummy` int(11) NOT NULL DEFAULT '0',
  `dragon_id` int(11) NOT NULL,
  `top_id` int(11) NOT NULL DEFAULT '0',
  `enemy_dragon_id` int(11) DEFAULT NULL,
  `poison` int(11) NOT NULL DEFAULT '0' COMMENT 'Veleno',
  `protection` int(11) NOT NULL DEFAULT '0' COMMENT 'Protezione',
  `dmg_boost` int(11) NOT NULL DEFAULT '0' COMMENT 'Danno aumentato',
  `confusion` int(11) NOT NULL DEFAULT '0' COMMENT 'Confuso',
  `wait_dmg` int(11) NOT NULL DEFAULT '0' COMMENT 'Colpo caricato',
  `ice` int(11) NOT NULL DEFAULT '0' COMMENT 'Congelamento',
  `wait_time` timestamp NULL DEFAULT NULL,
  `battle_time` timestamp NULL DEFAULT NULL,
  `no_match_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  UNIQUE KEY `dragon_id` (`dragon_id`),
  UNIQUE KEY `enemy_dragon_id` (`enemy_dragon_id`),
  CONSTRAINT `DRAGONID_VETTA` FOREIGN KEY (`dragon_id`) REFERENCES `dragon` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_VETTA` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `dragon_top_unlinked`
--

DROP TABLE IF EXISTS `dragon_top_unlinked`;
/*!50001 DROP VIEW IF EXISTS `dragon_top_unlinked`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `dragon_top_unlinked` (
  `dragon_id` tinyint NOT NULL,
  `combat_id` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `dungeon_list`
--

DROP TABLE IF EXISTS `dungeon_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dungeon_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) NOT NULL,
  `rooms` int(11) NOT NULL,
  `min_rank` int(8) NOT NULL DEFAULT '0',
  `duration` int(11) NOT NULL DEFAULT '0',
  `creation_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finish_date` timestamp NULL DEFAULT NULL,
  `main` int(11) NOT NULL DEFAULT '0',
  `notified` int(11) NOT NULL DEFAULT '0',
  `creator_id` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`) USING BTREE,
  KEY `creator_id` (`creator_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dungeon_market`
--

DROP TABLE IF EXISTS `dungeon_market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dungeon_market` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL DEFAULT '0',
  `dungeon_id` int(11) NOT NULL DEFAULT '0',
  `item_1` int(11) NOT NULL DEFAULT '0',
  `item_2` int(11) NOT NULL DEFAULT '0',
  `item_3` int(11) NOT NULL DEFAULT '0',
  `price_1` int(11) NOT NULL DEFAULT '0',
  `price_2` int(11) NOT NULL DEFAULT '0',
  `price_3` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `DUNGEONID` (`dungeon_id`),
  KEY `room_id` (`room_id`),
  KEY `item_1` (`item_1`),
  KEY `item_2` (`item_2`),
  KEY `item_3` (`item_3`),
  CONSTRAINT `ITEMID_DUNG1` FOREIGN KEY (`item_1`) REFERENCES `item` (`id`),
  CONSTRAINT `ITEMID_DUNG2` FOREIGN KEY (`item_2`) REFERENCES `item` (`id`),
  CONSTRAINT `ITEMID_DUNG3` FOREIGN KEY (`item_3`) REFERENCES `item` (`id`),
  CONSTRAINT `dungeon_id_market` FOREIGN KEY (`dungeon_id`) REFERENCES `dungeon_list` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dungeon_monsters`
--

DROP TABLE IF EXISTS `dungeon_monsters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dungeon_monsters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `level` int(11) NOT NULL,
  `name` varchar(32) NOT NULL,
  `life` int(11) NOT NULL,
  `weapon_id` int(11) NOT NULL,
  `weapon2_id` int(11) NOT NULL DEFAULT '0',
  `weapon3_id` int(11) NOT NULL DEFAULT '0',
  `charm_id` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `level` (`level`),
  KEY `weapon_id` (`weapon_id`),
  KEY `weapon2_id` (`weapon2_id`),
  KEY `weapon3_id` (`weapon3_id`),
  KEY `charm_id` (`charm_id`),
  CONSTRAINT `DUNG_WEAP` FOREIGN KEY (`weapon_id`) REFERENCES `item` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dungeon_rooms`
--

DROP TABLE IF EXISTS `dungeon_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dungeon_rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL DEFAULT '0',
  `dungeon_id` int(11) NOT NULL DEFAULT '0',
  `player_id` int(11) NOT NULL DEFAULT '0',
  `dir_top` int(11) NOT NULL DEFAULT '0',
  `dir_right` int(11) NOT NULL DEFAULT '0',
  `dir_left` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `DUNGEONID` (`dungeon_id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_ROOMS` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `dungeon_list_rooms` FOREIGN KEY (`dungeon_id`) REFERENCES `dungeon_list` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dungeon_status`
--

DROP TABLE IF EXISTS `dungeon_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dungeon_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `dungeon_id` int(11) NOT NULL DEFAULT '0',
  `room_id` int(11) NOT NULL DEFAULT '0',
  `last_dir` int(11) DEFAULT NULL,
  `monster_life` int(11) NOT NULL DEFAULT '0',
  `monster_id` int(11) NOT NULL DEFAULT '0',
  `monster_paralyzed` int(11) NOT NULL DEFAULT '0',
  `monster_critic` int(11) NOT NULL DEFAULT '0',
  `boss_battle` int(11) NOT NULL DEFAULT '0',
  `room_time` timestamp NULL DEFAULT NULL,
  `finish_time` timestamp NULL DEFAULT NULL,
  `param` text,
  `timevar` int(11) NOT NULL DEFAULT '0',
  `notified` int(11) NOT NULL DEFAULT '0',
  `pass` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `PLAYERID` (`player_id`),
  KEY `dungeon_id` (`dungeon_id`),
  CONSTRAINT `DUNGSTATUS_ID` FOREIGN KEY (`dungeon_id`) REFERENCES `dungeon_list` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `player_id_dungeon` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dungeon_trade`
--

DROP TABLE IF EXISTS `dungeon_trade`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dungeon_trade` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL DEFAULT '0',
  `dungeon_id` int(11) NOT NULL DEFAULT '0',
  `item_1` int(11) NOT NULL DEFAULT '0',
  `item_2` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `DUNGEONID2` (`dungeon_id`),
  KEY `item_1` (`item_1`),
  KEY `item_2` (`item_2`),
  CONSTRAINT `TRADE_ITEMID` FOREIGN KEY (`item_1`) REFERENCES `item` (`id`),
  CONSTRAINT `TRADE_ITEMID2` FOREIGN KEY (`item_2`) REFERENCES `item` (`id`),
  CONSTRAINT `dungeon_id_trade` FOREIGN KEY (`dungeon_id`) REFERENCES `dungeon_list` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dungeon_well`
--

DROP TABLE IF EXISTS `dungeon_well`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dungeon_well` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dungeon_id` int(11) NOT NULL,
  `amount` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `dungeon_id` (`dungeon_id`),
  CONSTRAINT `dungeon_id_well` FOREIGN KEY (`dungeon_id`) REFERENCES `dungeon_list` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_arena_dragon`
--

DROP TABLE IF EXISTS `event_arena_dragon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_arena_dragon` (
  `dragon_id` int(11) NOT NULL,
  `win` int(11) NOT NULL DEFAULT '0',
  `lose` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`dragon_id`),
  CONSTRAINT `DRAGONID_ARENA` FOREIGN KEY (`dragon_id`) REFERENCES `dragon` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_arena_status`
--

DROP TABLE IF EXISTS `event_arena_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_arena_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `extracted` int(11) NOT NULL DEFAULT '0',
  `win` int(11) NOT NULL DEFAULT '0',
  `lose` int(11) NOT NULL DEFAULT '0',
  `dragon_1` int(11) NOT NULL DEFAULT '0',
  `dragon_2` int(11) NOT NULL DEFAULT '0',
  `land_type` int(11) NOT NULL DEFAULT '0',
  `choice` int(11) NOT NULL DEFAULT '0',
  `bet_id` int(11) NOT NULL DEFAULT '0',
  `bet_qnt` int(11) NOT NULL DEFAULT '0',
  `fight_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_ARENA2` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_crafting_item`
--

DROP TABLE IF EXISTS `event_crafting_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_crafting_item` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `cnt` int(11) NOT NULL DEFAULT '0',
  `time` timestamp NULL DEFAULT NULL,
  `wait_time` timestamp NULL DEFAULT NULL,
  `total_price` int(11) NOT NULL DEFAULT '0',
  `start_price` int(11) NOT NULL DEFAULT '0',
  `full_price` int(11) NOT NULL DEFAULT '0',
  `increm` int(11) NOT NULL DEFAULT '0',
  `incremDelta` int(11) NOT NULL DEFAULT '0',
  `completed` int(11) NOT NULL DEFAULT '0',
  `reward` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `ITEMID_CRAFT` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_crafting_status`
--

DROP TABLE IF EXISTS `event_crafting_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_crafting_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `cnt` int(11) NOT NULL DEFAULT '0',
  `total_cnt` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_CRAFT` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_dust_status`
--

DROP TABLE IF EXISTS `event_dust_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_dust_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `extracting` int(11) NOT NULL DEFAULT '0',
  `generated` int(11) NOT NULL DEFAULT '0',
  `max_qnt` int(11) NOT NULL DEFAULT '5',
  `qnt` int(11) NOT NULL DEFAULT '1',
  `last_update` timestamp NULL DEFAULT NULL,
  `notified` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_DUST` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_gnomorra`
--

DROP TABLE IF EXISTS `event_gnomorra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_gnomorra` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `win` int(11) NOT NULL DEFAULT '0',
  `lose` int(11) NOT NULL DEFAULT '0',
  `win_streak` int(11) NOT NULL DEFAULT '0',
  `streak_record` int(11) NOT NULL DEFAULT '0',
  `suspend` int(11) NOT NULL DEFAULT '0',
  `enemy_id` int(11) DEFAULT NULL,
  `type` int(11) NOT NULL DEFAULT '0' COMMENT '0 = normal, 1 = practice',
  `invite_id` int(11) DEFAULT NULL,
  `invite_time` timestamp NULL DEFAULT NULL,
  `round_win` int(11) NOT NULL DEFAULT '0',
  `round_sel` int(11) NOT NULL DEFAULT '0' COMMENT '1 = carta, 2 = forbici, 3 = sasso',
  `battle_limit` int(11) NOT NULL DEFAULT '0',
  `practice_limit` int(11) NOT NULL DEFAULT '0',
  `game_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  KEY `gnomorra_invite_player` (`invite_id`),
  KEY `gnomorra_enemy_id` (`enemy_id`),
  CONSTRAINT `gnomorra_enemy_id` FOREIGN KEY (`enemy_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gnomorra_invite_player` FOREIGN KEY (`invite_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gnomorra_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_halloween_status`
--

DROP TABLE IF EXISTS `event_halloween_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_halloween_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `mission_type` int(11) NOT NULL DEFAULT '0',
  `time_end` text,
  `trick_count` int(11) NOT NULL DEFAULT '0',
  `trick_time` timestamp NULL DEFAULT NULL,
  `cauldron` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_HALLOW` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_lottery_coins`
--

DROP TABLE IF EXISTS `event_lottery_coins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_lottery_coins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_LOTTERY` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_lottery_prize`
--

DROP TABLE IF EXISTS `event_lottery_prize`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_lottery_prize` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `item_id` int(3) NOT NULL DEFAULT '0',
  `money` int(11) NOT NULL DEFAULT '0',
  `chest_id` int(11) NOT NULL DEFAULT '0',
  `gems` int(11) NOT NULL DEFAULT '0',
  `exp` int(11) NOT NULL DEFAULT '0',
  `mana` int(11) NOT NULL DEFAULT '0',
  `quantity` int(11) NOT NULL DEFAULT '1',
  `extracted` int(1) NOT NULL DEFAULT '0',
  `day` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_mana_status`
--

DROP TABLE IF EXISTS `event_mana_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_mana_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `zone_id` int(11) NOT NULL DEFAULT '0',
  `time_start` timestamp NULL DEFAULT NULL,
  `mana_1` int(11) NOT NULL DEFAULT '0' COMMENT 'Blu',
  `mana_2` int(11) NOT NULL DEFAULT '0' COMMENT 'Giallo',
  `mana_3` int(11) NOT NULL DEFAULT '0' COMMENT 'Rosso',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_MANAS` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_mana_zone`
--

DROP TABLE IF EXISTS `event_mana_zone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_mana_zone` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `type` int(2) NOT NULL,
  `mana_name` varchar(32) NOT NULL,
  `rate` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_robot_list`
--

DROP TABLE IF EXISTS `event_robot_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_robot_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(64) NOT NULL,
  `text` mediumtext NOT NULL,
  `r1` varchar(255) NOT NULL,
  `r2` varchar(255) NOT NULL,
  `r3` varchar(255) NOT NULL,
  `p1` int(11) NOT NULL DEFAULT '0',
  `p2` int(11) NOT NULL DEFAULT '0',
  `p3` int(11) NOT NULL DEFAULT '0',
  `item_id` int(11) DEFAULT '0',
  `money` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_robot_status`
--

DROP TABLE IF EXISTS `event_robot_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_robot_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `phase` int(11) NOT NULL DEFAULT '0',
  `craft_time` timestamp NULL DEFAULT NULL,
  `wait_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_snowball_list`
--

DROP TABLE IF EXISTS `event_snowball_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_snowball_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `life` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_SNOW2` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_snowball_status`
--

DROP TABLE IF EXISTS `event_snowball_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_snowball_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `snowball` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_SNOW` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_team_story`
--

DROP TABLE IF EXISTS `event_team_story`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_team_story` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL,
  `story_1` text,
  `story_2` text,
  `point_1` int(11) NOT NULL DEFAULT '0',
  `point_2` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_id` (`team_id`),
  CONSTRAINT `TEAMID_STORY` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_villa_gift`
--

DROP TABLE IF EXISTS `event_villa_gift`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_villa_gift` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_id` int(11) NOT NULL,
  `to_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `to_id` (`to_id`),
  KEY `from_id` (`from_id`),
  CONSTRAINT `ITEMID_VILLA` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_villa_status`
--

DROP TABLE IF EXISTS `event_villa_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_villa_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `points` int(11) NOT NULL DEFAULT '15',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_VILLA` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_wanted_status`
--

DROP TABLE IF EXISTS `event_wanted_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_wanted_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `wanted_id` int(11) NOT NULL DEFAULT '0',
  `heist_win` int(11) NOT NULL DEFAULT '0',
  `heist_lost` int(11) NOT NULL DEFAULT '0',
  `heist_win_2` int(11) NOT NULL DEFAULT '0',
  `heist_lost_2` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_WANTED` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_house_stats`
--

DROP TABLE IF EXISTS `game_house_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game_house_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `win` int(11) NOT NULL DEFAULT '0',
  `lose` int(11) NOT NULL DEFAULT '0',
  `pay` int(11) NOT NULL DEFAULT '0',
  `type` int(11) NOT NULL,
  `record` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_GAME` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `global_msg`
--

DROP TABLE IF EXISTS `global_msg`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `global_msg` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` bigint(16) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `heist`
--

DROP TABLE IF EXISTS `heist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `heist` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `from_id` int(3) NOT NULL DEFAULT '0',
  `to_id` int(3) NOT NULL DEFAULT '0',
  `datetime` timestamp NULL DEFAULT NULL,
  `rate1` int(8) NOT NULL DEFAULT '0',
  `grade` int(3) NOT NULL DEFAULT '0',
  `matchmaking` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `from_id_2` (`from_id`,`to_id`),
  KEY `to_id` (`to_id`),
  KEY `from_id` (`from_id`),
  CONSTRAINT `PID_HEIST` FOREIGN KEY (`from_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PID_HEIST_TO` FOREIGN KEY (`to_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `heist_history`
--

DROP TABLE IF EXISTS `heist_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `heist_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_id` int(11) NOT NULL,
  `to_id` int(11) NOT NULL,
  `rate1` int(11) NOT NULL DEFAULT '0',
  `rate2` int(11) NOT NULL DEFAULT '0',
  `rate3` int(11) NOT NULL DEFAULT '0',
  `fail` int(11) NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `heist_progress`
--

DROP TABLE IF EXISTS `heist_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `heist_progress` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_id` int(11) NOT NULL,
  `to_id` int(11) NOT NULL,
  `my_combination` int(11) NOT NULL DEFAULT '0',
  `combination` int(11) NOT NULL DEFAULT '0',
  `changeComb` int(11) DEFAULT '0',
  `travel` int(11) NOT NULL DEFAULT '0',
  `wait_time` timestamp NULL DEFAULT NULL,
  `time_end` timestamp NULL DEFAULT NULL,
  `isMatch` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `from_id` (`from_id`,`to_id`),
  KEY `from_id_2` (`from_id`),
  KEY `to_id` (`to_id`),
  CONSTRAINT `HPROGR1` FOREIGN KEY (`from_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `HPROGR2` FOREIGN KEY (`to_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `help_message`
--

DROP TABLE IF EXISTS `help_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `help_message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `type_1` int(11) NOT NULL DEFAULT '0',
  `type_2` int(11) NOT NULL DEFAULT '0',
  `type_3` int(11) NOT NULL DEFAULT '0',
  `type_4` int(11) NOT NULL DEFAULT '0',
  `type_5` int(11) NOT NULL DEFAULT '0',
  `type_6` int(11) NOT NULL DEFAULT '0',
  `type_7` int(11) NOT NULL DEFAULT '0',
  `type_8` int(11) NOT NULL DEFAULT '0',
  `type_9` int(11) NOT NULL DEFAULT '0',
  `type_10` int(11) NOT NULL DEFAULT '0',
  `type_11` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id_2` (`player_id`),
  CONSTRAINT `PID_HELP` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `holiday`
--

DROP TABLE IF EXISTS `holiday`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `holiday` (
  `id` int(8) NOT NULL AUTO_INCREMENT,
  `player_id` int(8) NOT NULL,
  `time_end` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `holi_pid` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `house`
--

DROP TABLE IF EXISTS `house`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `house` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) DEFAULT NULL,
  `rooms` int(3) NOT NULL DEFAULT '0',
  `grade` int(3) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `house_game_3`
--

DROP TABLE IF EXISTS `house_game_3`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `house_game_3` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `streak` int(11) NOT NULL DEFAULT '0',
  `card` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `HOUSE3_PID` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `house_room`
--

DROP TABLE IF EXISTS `house_room`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `house_room` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `house_id` int(3) NOT NULL DEFAULT '0',
  `name` text,
  `duration` int(11) NOT NULL DEFAULT '0',
  `success_rate` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `house_id` (`house_id`),
  CONSTRAINT `HOUSEID` FOREIGN KEY (`house_id`) REFERENCES `house` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_no_duplicate` (`player_id`,`item_id`) USING BTREE,
  KEY `player_id` (`player_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `inventory_itemid` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `inventory_playerid` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory_chest`
--

DROP TABLE IF EXISTS `inventory_chest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_chest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `chest_id` int(3) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_chest_no_duplicate` (`player_id`,`chest_id`),
  KEY `player_id` (`player_id`),
  KEY `chest_id` (`chest_id`),
  CONSTRAINT `chest_id_chest` FOREIGN KEY (`chest_id`) REFERENCES `chest` (`id`),
  CONSTRAINT `player_id_chest` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item`
--

DROP TABLE IF EXISTS `item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item` (
  `id` int(8) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `rarity` varchar(3) NOT NULL,
  `description` varchar(256) DEFAULT NULL,
  `value` int(8) NOT NULL,
  `estimate` int(11) NOT NULL DEFAULT '0',
  `reload_est` int(11) NOT NULL DEFAULT '0',
  `base_sum` int(11) NOT NULL DEFAULT '0',
  `price_sum` int(11) NOT NULL DEFAULT '0',
  `pnt_sum` int(11) NOT NULL DEFAULT '0',
  `craftable` tinyint(1) NOT NULL,
  `searchable` int(11) NOT NULL DEFAULT '1',
  `reborn` int(3) NOT NULL DEFAULT '1',
  `power` int(8) NOT NULL DEFAULT '0',
  `power_armor` int(8) NOT NULL DEFAULT '0',
  `power_shield` int(8) NOT NULL DEFAULT '0',
  `dragon_power` int(8) NOT NULL DEFAULT '0',
  `critical` int(8) NOT NULL DEFAULT '0',
  `category` int(11) NOT NULL DEFAULT '0',
  `cons` int(11) NOT NULL DEFAULT '0',
  `cons_val` decimal(5,2) NOT NULL DEFAULT '0.00',
  `allow_sell` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `rarity` (`rarity`),
  KEY `craft` (`craftable`),
  CONSTRAINT `ITEM_RARITYSN` FOREIGN KEY (`rarity`) REFERENCES `rarity` (`shortname`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `last_command`
--

DROP TABLE IF EXISTS `last_command`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `last_command` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` bigint(16) NOT NULL,
  `time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accountid` (`account_id`),
  KEY `time` (`time`),
  CONSTRAINT `ACCID_LASTCMD` FOREIGN KEY (`account_id`) REFERENCES `player` (`account_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `library`
--

DROP TABLE IF EXISTS `library`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `library` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(64) NOT NULL,
  `text` varchar(8192) DEFAULT NULL,
  `alt_text` varchar(512) NOT NULL,
  `view_order` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `lottery_public`
--

DROP TABLE IF EXISTS `lottery_public`;
/*!50001 DROP VIEW IF EXISTS `lottery_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `lottery_public` (
  `id` tinyint NOT NULL,
  `creator` tinyint NOT NULL,
  `player` tinyint NOT NULL,
  `item` tinyint NOT NULL,
  `money` tinyint NOT NULL,
  `time` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `magic`
--

DROP TABLE IF EXISTS `magic`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `magic` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT '0',
  `power` int(11) NOT NULL DEFAULT '0',
  `quantity` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `type` (`type`),
  CONSTRAINT `MAGIC_PID` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mana`
--

DROP TABLE IF EXISTS `mana`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mana` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(16) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `market`
--

DROP TABLE IF EXISTS `market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) DEFAULT NULL,
  `item_1_id` text,
  `item_2_id` text,
  `time_end` timestamp NULL DEFAULT NULL,
  `buyer` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `market_direct`
--

DROP TABLE IF EXISTS `market_direct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market_direct` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `money` int(16) NOT NULL,
  `time_end` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `buyer` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `item_id` (`item_id`),
  KEY `buyer` (`buyer`),
  CONSTRAINT `BUYER_MARK` FOREIGN KEY (`buyer`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ITEMID_MARK` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PID_MARK` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `market_direct_history`
--

DROP TABLE IF EXISTS `market_direct_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market_direct_history` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `item_id` int(3) NOT NULL,
  `price` int(8) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT '1',
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `from_id` int(8) DEFAULT NULL,
  `to_id` int(8) DEFAULT NULL,
  `buyer` int(11) DEFAULT NULL,
  `type` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `from_id` (`from_id`),
  KEY `to_id` (`to_id`),
  KEY `buyer` (`buyer`),
  KEY `type` (`type`),
  KEY `from_id_2` (`from_id`),
  KEY `to_id_2` (`to_id`),
  KEY `buyer_2` (`buyer`),
  CONSTRAINT `BUYERID_HISTD` FOREIGN KEY (`buyer`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FROMID_HISTD` FOREIGN KEY (`from_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ITEMID_HISTD` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TOID_HISTD` FOREIGN KEY (`to_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `market_direct_public`
--

DROP TABLE IF EXISTS `market_direct_public`;
/*!50001 DROP VIEW IF EXISTS `market_direct_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `market_direct_public` (
  `id` tinyint NOT NULL,
  `item_id` tinyint NOT NULL,
  `name` tinyint NOT NULL,
  `price` tinyint NOT NULL,
  `quantity` tinyint NOT NULL,
  `time` tinyint NOT NULL,
  `from_nick` tinyint NOT NULL,
  `to_nick` tinyint NOT NULL,
  `buyer` tinyint NOT NULL,
  `type` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `market_gift`
--

DROP TABLE IF EXISTS `market_gift`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market_gift` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `to_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `to_id` (`to_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `ITEMID_GIFT` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_GIFT` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_GIFT2` FOREIGN KEY (`to_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `market_history`
--

DROP TABLE IF EXISTS `market_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market_history` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `item_1` int(3) NOT NULL,
  `item_2` int(3) NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `from_id` int(8) DEFAULT NULL,
  `to_id` int(8) DEFAULT NULL,
  `buyer` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_1` (`item_1`),
  KEY `item_2` (`item_2`),
  KEY `from_id` (`from_id`),
  KEY `to_id` (`to_id`),
  KEY `buyer` (`buyer`),
  CONSTRAINT `ITEMID_H2` FOREIGN KEY (`item_1`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ITEMID_H2_2` FOREIGN KEY (`item_2`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PID_H2` FOREIGN KEY (`from_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PID_H2_2` FOREIGN KEY (`to_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PID_H2_3` FOREIGN KEY (`buyer`) REFERENCES `player` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `market_pack`
--

DROP TABLE IF EXISTS `market_pack`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market_pack` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pack_id` int(11) NOT NULL DEFAULT '0',
  `item_id` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `ITEMID_PACK` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `market_public`
--

DROP TABLE IF EXISTS `market_public`;
/*!50001 DROP VIEW IF EXISTS `market_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `market_public` (
  `id` tinyint NOT NULL,
  `item_1` tinyint NOT NULL,
  `name_1` tinyint NOT NULL,
  `item_2` tinyint NOT NULL,
  `name_2` tinyint NOT NULL,
  `time` tinyint NOT NULL,
  `from_nick` tinyint NOT NULL,
  `to_nick` tinyint NOT NULL,
  `buyer` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `merchant_offer`
--

DROP TABLE IF EXISTS `merchant_offer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `merchant_offer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL DEFAULT '0',
  `price` int(11) NOT NULL DEFAULT '0',
  `time_end` timestamp NULL DEFAULT NULL,
  `total_cnt` int(11) NOT NULL DEFAULT '0',
  `day_cnt` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `PLAYERID_MERCHANT` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `miner`
--

DROP TABLE IF EXISTS `miner`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `miner` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `hash` int(11) NOT NULL DEFAULT '0',
  `total_hash` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission`
--

DROP TABLE IF EXISTS `mission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` text NOT NULL,
  `chest_id` int(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `chest_id` (`chest_id`),
  CONSTRAINT `MISSION_CHESTID` FOREIGN KEY (`chest_id`) REFERENCES `chest` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_auto`
--

DROP TABLE IF EXISTS `mission_auto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_auto` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `chest_id` int(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `chest_id` (`chest_id`),
  CONSTRAINT `CHESTID_AUTO` FOREIGN KEY (`chest_id`) REFERENCES `chest` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_event_choice`
--

DROP TABLE IF EXISTS `mission_event_choice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_event_choice` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `text` text NOT NULL,
  `text1` text NOT NULL,
  `text2` text NOT NULL,
  `text3` text NOT NULL,
  `to_mission1` int(11) NOT NULL DEFAULT '0',
  `to_mission2` int(11) NOT NULL DEFAULT '0',
  `to_mission3` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_event_status`
--

DROP TABLE IF EXISTS `mission_event_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_event_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `life` int(11) NOT NULL DEFAULT '100',
  `choice_id` int(11) NOT NULL,
  `pos` int(11) NOT NULL DEFAULT '0',
  `neg` int(11) NOT NULL DEFAULT '0',
  `var_end` int(11) NOT NULL DEFAULT '0',
  `mission_end` timestamp NULL DEFAULT NULL,
  `mission_id` int(11) NOT NULL,
  `event_end` int(11) NOT NULL DEFAULT '0',
  `flag` int(11) NOT NULL DEFAULT '0',
  `vote` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_STORY` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_event_text`
--

DROP TABLE IF EXISTS `mission_event_text`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_event_text` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` text NOT NULL,
  `text` text NOT NULL,
  `choice` int(11) NOT NULL DEFAULT '0',
  `duration` int(11) NOT NULL DEFAULT '0',
  `pos` int(11) NOT NULL DEFAULT '0',
  `neg` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_team_list`
--

DROP TABLE IF EXISTS `mission_team_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_team_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(64) NOT NULL,
  `mandator` varchar(64) NOT NULL,
  `description` varchar(512) NOT NULL,
  `duration` int(11) NOT NULL COMMENT 'Secondi per parte',
  `parts` int(11) NOT NULL DEFAULT '0',
  `daynight` int(11) NOT NULL DEFAULT '0' COMMENT '0 = null, 1 = day, 2 = night',
  `requirement_id` int(11) NOT NULL,
  `reward_code` varchar(32) DEFAULT NULL COMMENT 'qnt:type, monete/1000',
  `progress_num` int(11) NOT NULL DEFAULT '0',
  `ready` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_team_list_part`
--

DROP TABLE IF EXISTS `mission_team_list_part`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_team_list_part` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `list_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL,
  `question` varchar(2048) NOT NULL,
  `answ1` varchar(128) NOT NULL,
  `answ2` varchar(128) NOT NULL,
  `answ3` varchar(128) NOT NULL,
  `pnt1` int(11) NOT NULL DEFAULT '0',
  `pnt2` int(11) NOT NULL DEFAULT '0',
  `pnt3` int(11) NOT NULL DEFAULT '0',
  `report1` varchar(512) DEFAULT NULL,
  `report2` varchar(512) DEFAULT NULL,
  `report3` varchar(512) DEFAULT NULL,
  `end_text` varchar(1024) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `list_id` (`list_id`),
  CONSTRAINT `list_id_parts` FOREIGN KEY (`list_id`) REFERENCES `mission_team_list` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_team_party`
--

DROP TABLE IF EXISTS `mission_team_party`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_team_party` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `party_id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL DEFAULT '0',
  `assigned_to` int(11) DEFAULT NULL,
  `report_id` int(11) DEFAULT NULL,
  `mission_start` timestamp NULL DEFAULT NULL,
  `mission_time_end` timestamp NULL DEFAULT NULL,
  `mission_time_limit` timestamp NULL DEFAULT NULL,
  `wait` tinyint(1) NOT NULL DEFAULT '0',
  `text_user` varchar(64) DEFAULT NULL,
  `progress` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_id` (`report_id`) USING BTREE,
  KEY `team_id` (`team_id`),
  CONSTRAINT `Mission_Team_Report` FOREIGN KEY (`report_id`) REFERENCES `mission_team_report` (`report_id`),
  CONSTRAINT `Party_Team_id` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_team_party_player`
--

DROP TABLE IF EXISTS `mission_team_party_player`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_team_party_player` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL,
  `party_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `answ_id` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  KEY `mission_team_party_team` (`team_id`),
  CONSTRAINT `mission_team_party_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mission_team_party_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_team_report`
--

DROP TABLE IF EXISTS `mission_team_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_team_report` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `report_id` int(11) DEFAULT NULL,
  `party_id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL,
  `answ_id` int(11) NOT NULL,
  `pnt` int(11) NOT NULL DEFAULT '0',
  `text` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `no_duplicate` (`report_id`,`party_id`,`team_id`,`part_id`),
  KEY `report_id` (`report_id`),
  KEY `team_id` (`team_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_team_requirement`
--

DROP TABLE IF EXISTS `mission_team_requirement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_team_requirement` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requirement_id` int(11) NOT NULL,
  `type` varchar(32) NOT NULL,
  `value` int(11) NOT NULL,
  `member` varchar(16) NOT NULL,
  `complex` int(11) NOT NULL DEFAULT '0' COMMENT '0-10',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_zone`
--

DROP TABLE IF EXISTS `mission_zone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_zone` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rarity` varchar(3) NOT NULL,
  `name` varchar(32) NOT NULL,
  `description` varchar(255) NOT NULL,
  `duration` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `rarity` (`rarity`),
  CONSTRAINT `RARITYID_SN` FOREIGN KEY (`rarity`) REFERENCES `rarity` (`shortname`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_zone_item`
--

DROP TABLE IF EXISTS `mission_zone_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mission_zone_item` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `zone_id` int(11) NOT NULL,
  `rarity_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `zone_id` (`zone_id`),
  KEY `rarity_id` (`rarity_id`),
  CONSTRAINT `ITEMID_ZONE` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RARITYID_ZONE` FOREIGN KEY (`rarity_id`) REFERENCES `rarity` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ZONEID_ZONE` FOREIGN KEY (`zone_id`) REFERENCES `mission_zone` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `necro_change`
--

DROP TABLE IF EXISTS `necro_change`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `necro_change` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_NECRO` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `necro_game`
--

DROP TABLE IF EXISTS `necro_game`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `necro_game` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `step` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  CONSTRAINT `player_id_necro` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `one_time_gift`
--

DROP TABLE IF EXISTS `one_time_gift`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `one_time_gift` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PLAYERID_ONET` (`player_id`),
  CONSTRAINT `PLAYERID_ONETIME` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pay_history`
--

DROP TABLE IF EXISTS `pay_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pay_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_id` int(11) NOT NULL,
  `to_id` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  `hist_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `from_id` (`from_id`),
  KEY `to_id` (`to_id`),
  CONSTRAINT `PLAYERID_PAYFROM` FOREIGN KEY (`from_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PLAYERID_PAYTO` FOREIGN KEY (`to_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `pay_public`
--

DROP TABLE IF EXISTS `pay_public`;
/*!50001 DROP VIEW IF EXISTS `pay_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `pay_public` (
  `id` tinyint NOT NULL,
  `from_nick` tinyint NOT NULL,
  `to_nick` tinyint NOT NULL,
  `price` tinyint NOT NULL,
  `time` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `payload` varchar(128) NOT NULL,
  `status` varchar(5) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `player`
--

DROP TABLE IF EXISTS `player`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player` (
  `id` int(8) NOT NULL AUTO_INCREMENT,
  `account_id` bigint(16) NOT NULL,
  `chat_id` bigint(16) DEFAULT NULL,
  `nickname` varchar(64) NOT NULL,
  `market_ban` tinyint(1) NOT NULL DEFAULT '0',
  `group_ban` int(11) NOT NULL DEFAULT '0',
  `market_warn` tinyint(1) NOT NULL DEFAULT '0',
  `reborn` int(3) NOT NULL DEFAULT '1',
  `exp` int(16) NOT NULL DEFAULT '0',
  `class` tinyint(1) NOT NULL DEFAULT '1',
  `ability` int(11) NOT NULL DEFAULT '100',
  `rank` int(8) NOT NULL DEFAULT '0',
  `life` int(32) NOT NULL DEFAULT '0',
  `total_life` int(32) NOT NULL DEFAULT '0',
  `money` int(16) NOT NULL DEFAULT '100',
  `magic_to` int(11) NOT NULL DEFAULT '0',
  `dragon_to` int(11) NOT NULL DEFAULT '0',
  `paralyzed` int(11) NOT NULL DEFAULT '0',
  `market_pack` int(11) NOT NULL DEFAULT '0',
  `refilled` tinyint(1) NOT NULL DEFAULT '0',
  `mission_id` int(3) NOT NULL DEFAULT '0',
  `mission_gem` int(11) NOT NULL DEFAULT '0',
  `mission_time_end` timestamp NULL DEFAULT NULL,
  `mission_special_id` int(11) NOT NULL DEFAULT '0',
  `mission_special_time_end` timestamp NULL DEFAULT NULL,
  `mission_party` tinyint(1) NOT NULL DEFAULT '0',
  `travel_id` int(3) NOT NULL DEFAULT '0',
  `travel_time_end` timestamp NULL DEFAULT NULL,
  `travel_limit` int(11) NOT NULL DEFAULT '0',
  `travel_team_id` int(11) NOT NULL DEFAULT '0',
  `boost_id` tinyint(1) NOT NULL DEFAULT '0',
  `boost_mission` int(3) NOT NULL DEFAULT '0',
  `cave_id` int(3) NOT NULL DEFAULT '0',
  `cave_gem` int(11) NOT NULL DEFAULT '0',
  `cave_time_end` timestamp NULL DEFAULT NULL,
  `cave_limit` int(11) NOT NULL DEFAULT '0',
  `gems` int(3) NOT NULL DEFAULT '0',
  `necro_pnt` int(11) NOT NULL DEFAULT '0',
  `mkeys` int(11) NOT NULL DEFAULT '0',
  `moon_coin` int(11) NOT NULL DEFAULT '4',
  `mission_auto_id` int(3) NOT NULL DEFAULT '1',
  `mission_count` int(11) NOT NULL DEFAULT '0',
  `mission_team_count` int(11) NOT NULL DEFAULT '0',
  `achievement_count` int(11) NOT NULL DEFAULT '0',
  `boss_id` int(3) DEFAULT NULL,
  `team_time` timestamp NULL DEFAULT NULL,
  `boss_time` timestamp NULL DEFAULT NULL,
  `team_mission_time` timestamp NULL DEFAULT NULL,
  `dungeon_time` timestamp NULL DEFAULT NULL,
  `dungeon_skip` int(11) NOT NULL DEFAULT '0',
  `dungeon_count` int(11) NOT NULL DEFAULT '0',
  `craft_count` int(8) NOT NULL DEFAULT '0',
  `craft_week` int(11) NOT NULL DEFAULT '0',
  `weapon` int(3) DEFAULT '0',
  `weapon_id` int(3) NOT NULL DEFAULT '0',
  `weapon_crit` int(3) NOT NULL DEFAULT '0',
  `weapon_enchant` int(11) NOT NULL DEFAULT '0',
  `weapon_enchant_end` timestamp NULL DEFAULT NULL,
  `weapon_enchant_bonus` int(11) NOT NULL DEFAULT '0',
  `weapon2` int(3) DEFAULT '0',
  `weapon2_id` int(3) NOT NULL DEFAULT '0',
  `weapon2_crit` int(3) NOT NULL DEFAULT '0',
  `weapon2_enchant` int(11) NOT NULL DEFAULT '0',
  `weapon2_enchant_end` timestamp NULL DEFAULT NULL,
  `weapon2_enchant_bonus` int(11) NOT NULL DEFAULT '0',
  `weapon3` int(3) NOT NULL DEFAULT '0',
  `weapon3_id` int(3) NOT NULL DEFAULT '0',
  `weapon3_crit` int(3) NOT NULL DEFAULT '0',
  `weapon3_enchant` int(11) NOT NULL DEFAULT '0',
  `weapon3_enchant_end` timestamp NULL DEFAULT NULL,
  `weapon3_enchant_bonus` int(11) NOT NULL DEFAULT '0',
  `gain_exp` int(11) NOT NULL DEFAULT '0',
  `power_pnt` int(11) NOT NULL DEFAULT '0',
  `power_used` int(11) NOT NULL DEFAULT '0',
  `power_dmg` int(11) NOT NULL DEFAULT '0',
  `power_def` int(11) NOT NULL DEFAULT '0',
  `power_weapon` int(11) NOT NULL DEFAULT '0',
  `power_armor` int(11) NOT NULL DEFAULT '0',
  `power_shield` int(11) NOT NULL DEFAULT '0',
  `charm_id` int(3) DEFAULT '0',
  `house_id` int(3) NOT NULL DEFAULT '1',
  `heist_count` int(3) NOT NULL DEFAULT '0',
  `heist_streak` int(11) NOT NULL DEFAULT '0',
  `heist_protection` timestamp NULL DEFAULT NULL,
  `spy_count` int(3) NOT NULL DEFAULT '0',
  `heist_limit` int(3) NOT NULL DEFAULT '0',
  `capsule_limit` int(11) NOT NULL DEFAULT '0',
  `invite_code` varchar(16) NOT NULL,
  `event` int(2) NOT NULL DEFAULT '0',
  `last_mm` int(11) NOT NULL DEFAULT '0',
  `custom_name` varchar(32) DEFAULT NULL,
  `custom_name2` varchar(32) DEFAULT NULL,
  `custom_name3` varchar(32) DEFAULT NULL,
  `custom_name_h` varchar(32) DEFAULT NULL,
  `player_description` varchar(512) DEFAULT NULL,
  `player_custom_nickname` varchar(32) DEFAULT NULL,
  `lore_page` int(11) NOT NULL DEFAULT '0',
  `lore_mission` int(11) NOT NULL DEFAULT '0',
  `holiday` tinyint(1) NOT NULL DEFAULT '0',
  `global_event` int(11) NOT NULL DEFAULT '0',
  `global_end` int(11) NOT NULL DEFAULT '0',
  `bag_min` int(11) NOT NULL DEFAULT '0',
  `class_change` int(11) NOT NULL DEFAULT '0',
  `top_min` int(11) NOT NULL DEFAULT '0',
  `global_msg` int(11) NOT NULL DEFAULT '1',
  `kill_streak_ok` int(11) NOT NULL DEFAULT '0',
  `boost_cast` int(11) NOT NULL DEFAULT '0',
  `res_time` timestamp NULL DEFAULT NULL,
  `status` int(11) DEFAULT NULL,
  `status_cnt` int(11) NOT NULL DEFAULT '0',
  `top_first` tinyint(1) NOT NULL DEFAULT '0',
  `donation` int(11) NOT NULL DEFAULT '0',
  `real_name` varchar(64) DEFAULT NULL,
  `gender` varchar(1) NOT NULL DEFAULT 'M',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nickname` (`nickname`),
  UNIQUE KEY `account_id` (`account_id`),
  KEY `boss_id` (`boss_id`),
  CONSTRAINT `player_boss_id` FOREIGN KEY (`boss_id`) REFERENCES `boss_team` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `limit_money_life` BEFORE UPDATE ON `player` FOR EACH ROW BEGIN
IF NEW.money > 1000000000 THEN
SET NEW.money = 1000000000;
END IF;
IF NEW.life < 0 THEN
SET NEW.life = 0;
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Temporary table structure for view `player_public`
--

DROP TABLE IF EXISTS `player_public`;
/*!50001 DROP VIEW IF EXISTS `player_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `player_public` (
  `id` tinyint NOT NULL,
  `nickname` tinyint NOT NULL,
  `team` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `plus_groups`
--

DROP TABLE IF EXISTS `plus_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plus_groups` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` varchar(511) NOT NULL,
  `chat_id` varchar(64) NOT NULL DEFAULT '0',
  `members` int(11) NOT NULL DEFAULT '0',
  `welcome_text` varchar(1024) DEFAULT NULL,
  `welcome` int(1) NOT NULL DEFAULT '0',
  `max_lev` int(11) NOT NULL DEFAULT '0',
  `min_lev` int(11) NOT NULL DEFAULT '0',
  `level` int(11) NOT NULL DEFAULT '0',
  `kickban` int(11) NOT NULL DEFAULT '0',
  `kickreg` int(11) NOT NULL DEFAULT '0',
  `always` int(11) NOT NULL DEFAULT '0',
  `last_update` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chat_id` (`chat_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plus_history`
--

DROP TABLE IF EXISTS `plus_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plus_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plus_notify`
--

DROP TABLE IF EXISTS `plus_notify`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plus_notify` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT '0',
  `deny` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_NOTIFY` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plus_players`
--

DROP TABLE IF EXISTS `plus_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plus_players` (
  `account_id` int(16) NOT NULL,
  `nickname` text NOT NULL,
  `real_name` varchar(64) DEFAULT NULL,
  `gender` varchar(1) DEFAULT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plus_shop_timeout`
--

DROP TABLE IF EXISTS `plus_shop_timeout`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plus_shop_timeout` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `player_id2` int(11) NOT NULL,
  `datetime` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `player_id2` (`player_id2`),
  CONSTRAINT `PLAYER1_TIMEOUT` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
  CONSTRAINT `PLAYER2_TIMEOUT` FOREIGN KEY (`player_id2`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `public_lottery`
--

DROP TABLE IF EXISTS `public_lottery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `public_lottery` (
  `id` int(8) NOT NULL AUTO_INCREMENT,
  `chat_id` bigint(32) NOT NULL,
  `creator_id` int(8) NOT NULL,
  `item_id` int(8) NOT NULL,
  `price` int(11) NOT NULL DEFAULT '0',
  `money` int(11) NOT NULL DEFAULT '0',
  `time_end` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `creator_id` (`creator_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `CREATORID_LOTTERY` FOREIGN KEY (`creator_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ITEMID_LOTTERY` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `public_lottery_history`
--

DROP TABLE IF EXISTS `public_lottery_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `public_lottery_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creator_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `money` int(11) NOT NULL,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `creator_id` (`creator_id`),
  KEY `player_id` (`player_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `lottery_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `lottery_playerid` FOREIGN KEY (`creator_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lottery_playerid_2` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `public_lottery_players`
--

DROP TABLE IF EXISTS `public_lottery_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `public_lottery_players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lottery_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_LOTTP` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `public_shop`
--

DROP TABLE IF EXISTS `public_shop`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `public_shop` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `code` bigint(32) NOT NULL,
  `item_id` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `time_end` timestamp NULL DEFAULT NULL,
  `notified` int(3) NOT NULL DEFAULT '0',
  `public` int(11) NOT NULL DEFAULT '0',
  `massive` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `PLAYERID` (`player_id`),
  KEY `item_id` (`item_id`),
  KEY `code` (`code`),
  CONSTRAINT `ITEMID_SHOP` FOREIGN KEY (`item_id`) REFERENCES `item` (`id`),
  CONSTRAINT `player_id_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rarity`
--

DROP TABLE IF EXISTS `rarity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rarity` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) NOT NULL,
  `shortname` varchar(3) NOT NULL,
  `special_mission` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shortname` (`shortname`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reborn_save`
--

DROP TABLE IF EXISTS `reborn_save`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reborn_save` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `saved` int(11) NOT NULL DEFAULT '1',
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `referral_list`
--

DROP TABLE IF EXISTS `referral_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `referral_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `new_player` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `new_player_nick` varchar(64) DEFAULT NULL,
  `player_nick` varchar(64) DEFAULT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reward` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `new_player` (`new_player`),
  KEY `player_id` (`player_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `search_history`
--

DROP TABLE IF EXISTS `search_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `search_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `term` text,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_SEARCH` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `search_public`
--

DROP TABLE IF EXISTS `search_public`;
/*!50001 DROP VIEW IF EXISTS `search_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `search_public` (
  `id` tinyint NOT NULL,
  `term` tinyint NOT NULL,
  `time` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `set_list`
--

DROP TABLE IF EXISTS `set_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `set_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `name` text NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT '0',
  `item_weapon` int(11) NOT NULL DEFAULT '0',
  `item_armor` int(11) NOT NULL DEFAULT '0',
  `item_shield` int(11) NOT NULL DEFAULT '0',
  `item_charm` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_SET` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `shop_public`
--

DROP TABLE IF EXISTS `shop_public`;
/*!50001 DROP VIEW IF EXISTS `shop_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `shop_public` (
  `nickname` tinyint NOT NULL,
  `code` tinyint NOT NULL,
  `item_id` tinyint NOT NULL,
  `price` tinyint NOT NULL,
  `quantity` tinyint NOT NULL,
  `time_end` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `slogan` varchar(255) DEFAULT NULL,
  `level` int(3) NOT NULL DEFAULT '1',
  `point` int(11) NOT NULL DEFAULT '10',
  `boss_batch` tinyint(4) NOT NULL DEFAULT '0',
  `players` int(3) NOT NULL DEFAULT '1',
  `max_players` int(3) NOT NULL DEFAULT '3',
  `min_lev` int(11) NOT NULL DEFAULT '0',
  `boss_count` int(3) NOT NULL DEFAULT '0',
  `craft_count` int(11) NOT NULL DEFAULT '0',
  `mission_count` int(11) NOT NULL DEFAULT '0',
  `mission_count_diff` int(11) NOT NULL DEFAULT '0',
  `mission_day_count` int(11) NOT NULL DEFAULT '0',
  `boss_respawn` timestamp NULL DEFAULT NULL,
  `closed` int(3) NOT NULL DEFAULT '0',
  `details` int(11) NOT NULL DEFAULT '0',
  `child_team` int(11) NOT NULL DEFAULT '0',
  `child_time` timestamp NULL DEFAULT NULL,
  `kill_num1` int(11) NOT NULL DEFAULT '0',
  `kill_num2` int(11) NOT NULL DEFAULT '0',
  `boost_id` int(11) NOT NULL DEFAULT '0',
  `boost_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `child_team` (`child_team`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team_boost`
--

DROP TABLE IF EXISTS `team_boost`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_boost` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL DEFAULT '0',
  `boost_id` int(11) NOT NULL DEFAULT '0',
  `level` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `team_id` (`team_id`),
  CONSTRAINT `TEAMID_BOOST` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team_player`
--

DROP TABLE IF EXISTS `team_player`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_player` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `player_id` int(3) NOT NULL,
  `team_id` int(3) NOT NULL,
  `role` int(11) NOT NULL DEFAULT '0',
  `suspended` int(11) NOT NULL DEFAULT '0',
  `notification` int(11) NOT NULL DEFAULT '1',
  `kill_streak` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  KEY `team_id` (`team_id`),
  CONSTRAINT `PLAYERID_TEAM` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teamId_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `team_public`
--

DROP TABLE IF EXISTS `team_public`;
/*!50001 DROP VIEW IF EXISTS `team_public`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `team_public` (
  `name` tinyint NOT NULL,
  `nickname` tinyint NOT NULL,
  `role` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `tear`
--

DROP TABLE IF EXISTS `tear`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tear` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `PLAYERID_TEAR` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `token`
--

DROP TABLE IF EXISTS `token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `token` varchar(128) DEFAULT NULL,
  `status` varchar(32) DEFAULT NULL,
  `ip` varchar(16) DEFAULT NULL,
  `last_query` timestamp NULL DEFAULT NULL,
  `query_num` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`),
  UNIQUE KEY `token` (`token`),
  CONSTRAINT `PLAYERID_TOKEN` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `travel`
--

DROP TABLE IF EXISTS `travel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `travel` (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `duration` int(16) NOT NULL,
  `chest_id` int(16) NOT NULL,
  `money` int(16) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `auction_public`
--

/*!50001 DROP TABLE IF EXISTS `auction_public`*/;
/*!50001 DROP VIEW IF EXISTS `auction_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `auction_public` AS select `L`.`id` AS `id`,`P1`.`nickname` AS `creator`,`P2`.`nickname` AS `player`,`I`.`name` AS `item`,`L`.`price` AS `price`,`L`.`time` AS `time` from (((`auction_history` `L` join `player` `P1` on((`P1`.`id` = `L`.`creator_id`))) join `player` `P2` on((`P2`.`id` = `L`.`player_id`))) join `item` `I` on((`I`.`id` = `L`.`item_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `boss_damage_view`
--

/*!50001 DROP TABLE IF EXISTS `boss_damage_view`*/;
/*!50001 DROP VIEW IF EXISTS `boss_damage_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `boss_damage_view` AS select `team_player`.`notification` AS `notification`,`player`.`nickname` AS `nickname`,`player`.`id` AS `player_id`,`player`.`chat_id` AS `chat_id`,sum(`boss_damage`.`damage`) AS `damage`,`boss_damage`.`boss_id` AS `boss_id`,`boss_damage`.`team_id` AS `team_id` from ((`boss_damage` join `player`) join `team_player`) where ((`team_player`.`player_id` = `player`.`id`) and (`player`.`id` = `boss_damage`.`player_id`)) group by `player`.`nickname`,`boss_damage`.`boss_id`,`boss_damage`.`team_id` order by sum(`boss_damage`.`damage`) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `craft_public`
--

/*!50001 DROP TABLE IF EXISTS `craft_public`*/;
/*!50001 DROP VIEW IF EXISTS `craft_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `craft_public` AS select `C`.`id` AS `id`,`I1`.`name` AS `material_1`,`I2`.`name` AS `material_2`,`I3`.`name` AS `material_3`,`I4`.`name` AS `material_result` from ((((`craft` `C` join `item` `I1` on((`I1`.`id` = `C`.`material_1`))) join `item` `I2` on((`I2`.`id` = `C`.`material_2`))) join `item` `I3` on((`I3`.`id` = `C`.`material_3`))) join `item` `I4` on((`I4`.`id` = `C`.`material_result`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `craft_public_id`
--

/*!50001 DROP TABLE IF EXISTS `craft_public_id`*/;
/*!50001 DROP VIEW IF EXISTS `craft_public_id`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `craft_public_id` AS select `craft`.`id` AS `id`,`craft`.`material_1` AS `material_1`,`craft`.`material_2` AS `material_2`,`craft`.`material_3` AS `material_3`,`craft`.`material_result` AS `material_result` from `craft` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `dragon_top_unlinked`
--

/*!50001 DROP TABLE IF EXISTS `dragon_top_unlinked`*/;
/*!50001 DROP VIEW IF EXISTS `dragon_top_unlinked`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `dragon_top_unlinked` AS (select `S`.`dragon_id` AS `dragon_id`,(select `S1`.`dragon_id` from `dragon_top_status` `S1` where (`S1`.`enemy_dragon_id` = `S`.`dragon_id`)) AS `combat_id` from (`dragon_top_rank` `R` join `dragon_top_status` `S`) where ((`R`.`dragon_id` = `S`.`dragon_id`) and isnull(`S`.`enemy_dragon_id`) and (`R`.`combat` = 1)) having isnull(`combat_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `lottery_public`
--

/*!50001 DROP TABLE IF EXISTS `lottery_public`*/;
/*!50001 DROP VIEW IF EXISTS `lottery_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `lottery_public` AS select `L`.`id` AS `id`,`P1`.`nickname` AS `creator`,`P2`.`nickname` AS `player`,`I`.`name` AS `item`,`L`.`money` AS `money`,`L`.`time` AS `time` from (((`public_lottery_history` `L` join `player` `P1` on((`P1`.`id` = `L`.`creator_id`))) join `player` `P2` on((`P2`.`id` = `L`.`player_id`))) join `item` `I` on((`I`.`id` = `L`.`item_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `market_direct_public`
--

/*!50001 DROP TABLE IF EXISTS `market_direct_public`*/;
/*!50001 DROP VIEW IF EXISTS `market_direct_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `market_direct_public` AS select `M`.`id` AS `id`,`M`.`item_id` AS `item_id`,`item`.`name` AS `name`,`M`.`price` AS `price`,`M`.`quantity` AS `quantity`,`M`.`time` AS `time`,`P1`.`nickname` AS `from_nick`,`P2`.`nickname` AS `to_nick`,`M`.`buyer` AS `buyer`,`M`.`type` AS `type` from (((`market_direct_history` `M` join `player` `P1` on((`M`.`from_id` = `P1`.`id`))) join `player` `P2` on((`M`.`to_id` = `P2`.`id`))) join `item`) where (`item`.`id` = `M`.`item_id`) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `market_public`
--

/*!50001 DROP TABLE IF EXISTS `market_public`*/;
/*!50001 DROP VIEW IF EXISTS `market_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `market_public` AS select `M`.`id` AS `id`,`M`.`item_1` AS `item_1`,`I1`.`name` AS `name_1`,`M`.`item_2` AS `item_2`,`I2`.`name` AS `name_2`,`M`.`time` AS `time`,`P1`.`nickname` AS `from_nick`,`P2`.`nickname` AS `to_nick`,`M`.`buyer` AS `buyer` from ((((`market_history` `M` join `player` `P1` on((`M`.`from_id` = `P1`.`id`))) join `player` `P2` on((`M`.`to_id` = `P2`.`id`))) join `item` `I1` on((`I1`.`id` = `M`.`item_1`))) join `item` `I2` on((`I2`.`id` = `M`.`item_2`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `pay_public`
--

/*!50001 DROP TABLE IF EXISTS `pay_public`*/;
/*!50001 DROP VIEW IF EXISTS `pay_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `pay_public` AS select `H`.`id` AS `id`,`P1`.`nickname` AS `from_nick`,`P2`.`nickname` AS `to_nick`,`H`.`price` AS `price`,`H`.`hist_time` AS `time` from ((`pay_history` `H` join `player` `P1` on((`H`.`from_id` = `P1`.`id`))) join `player` `P2` on((`H`.`to_id` = `P2`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `player_public`
--

/*!50001 DROP TABLE IF EXISTS `player_public`*/;
/*!50001 DROP VIEW IF EXISTS `player_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `player_public` AS select `player`.`id` AS `id`,`player`.`nickname` AS `nickname`,`team`.`name` AS `team` from ((`player` left join `team_player` on((`player`.`id` = `team_player`.`player_id`))) left join `team` on((`team_player`.`team_id` = `team`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `search_public`
--

/*!50001 DROP TABLE IF EXISTS `search_public`*/;
/*!50001 DROP VIEW IF EXISTS `search_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `search_public` AS select `search_history`.`id` AS `id`,`search_history`.`term` AS `term`,`search_history`.`time` AS `time` from `search_history` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `shop_public`
--

/*!50001 DROP TABLE IF EXISTS `shop_public`*/;
/*!50001 DROP VIEW IF EXISTS `shop_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `shop_public` AS select `player`.`nickname` AS `nickname`,`public_shop`.`code` AS `code`,`public_shop`.`item_id` AS `item_id`,`public_shop`.`price` AS `price`,`public_shop`.`quantity` AS `quantity`,`public_shop`.`time_end` AS `time_end` from (`public_shop` join `player`) where ((`public_shop`.`public` = 1) and (`player`.`id` = `public_shop`.`player_id`)) order by `public_shop`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `team_public`
--

/*!50001 DROP TABLE IF EXISTS `team_public`*/;
/*!50001 DROP VIEW IF EXISTS `team_public`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `team_public` AS select `team`.`name` AS `name`,`player`.`nickname` AS `nickname`,`team_player`.`role` AS `role` from ((`team` join `team_player`) join `player`) where ((`team`.`id` = `team_player`.`team_id`) and (`player`.`id` = `team_player`.`player_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-06-05 15:00:10
