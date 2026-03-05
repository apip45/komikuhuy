/**
 * ===========================================
 * AF-Komik V2 - Admin Controllers Index
 * ===========================================
 * 
 * Exports all admin controllers for easy importing.
 */

const AdminController = require('./adminController');
const UserAdminController = require('./userAdminController');
const ScraperAdminController = require('./scraperAdminController');
const CacheAdminController = require('./cacheAdminController');

module.exports = {
  AdminController,
  UserAdminController,
  ScraperAdminController,
  CacheAdminController
};
