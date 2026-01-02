/**
 * ===========================================
 * AF-Komik V2 - Index Controller
 * ===========================================
 * 
 * Controller for handling main page routes.
 * Renders homepage, login, and registration pages.
 */

const logger = require('../config/logger');

/**
 * Render the homepage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getHomePage = async (req, res, next) => {
  try {
    res.render('pages/home', {
      title: 'AF-Komik - Baca Komik Online',
      layout: 'layouts/main',
      currentPage: 'home'
    });
  } catch (error) {
    logger.error(`Error rendering homepage: ${error.message}`);
    next(error);
  }
};

/**
 * Render the login page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getLoginPage = async (req, res, next) => {
  try {
    res.render('pages/login', {
      title: 'Login - AF-Komik',
      layout: 'layouts/main',
      currentPage: 'login'
    });
  } catch (error) {
    logger.error(`Error rendering login page: ${error.message}`);
    next(error);
  }
};

/**
 * Render the registration page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRegisterPage = async (req, res, next) => {
  try {
    res.render('pages/register', {
      title: 'Register - AF-Komik',
      layout: 'layouts/main',
      currentPage: 'register'
    });
  } catch (error) {
    logger.error(`Error rendering registration page: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getHomePage,
  getLoginPage,
  getRegisterPage
};
