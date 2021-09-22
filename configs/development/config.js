/*
 *
 * Example (Main)
 *
 */

const config = {};

// Logger Configuration
config.logger = {};
config.logger.logColors = true;
config.logger.logLevel = 'debug';

// Clustering Configuration
config.clustering = {};
config.clustering.enabled = true;
config.clustering.forks = 'auto';

// Redis Configuration
config.redis = {};
config.redis.host = 'CHANGE ME';
config.redis.port = 6379;
config.redis.password = '';

// Server Configuration
config.server = {};
config.server.host = '0.0.0.0';
config.server.port = 3001;

// Export Configuration
module.exports = config;
