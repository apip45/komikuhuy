/**
 * ===========================================
 * AF-Komik V2 - User Admin Controller
 * ===========================================
 * 
 * Handles user management functionality:
 * - List all users
 * - Update user roles
 * - Reset user passwords
 * - Disable/enable users
 */

const User = require('../../models/User');
const logger = require('../../config/logger');
const crypto = require('crypto');

/**
 * User Admin Controller
 */
const UserAdminController = {
  
  /**
   * Render user management page
   * GET /admin/users
   */
  async listUsers(req, res) {
    try {
      logger.info(`User management accessed by admin ${req.session.userId}`);
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const skip = (page - 1) * limit;
      
      // Build search query
      const query = {};
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Get users with pagination
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.render('pages/admin/users', {
        layout: 'layouts/admin',
        title: 'User Management - Admin',
        page: 'users',
        user: req.session,
        users,
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit
        },
        search,
        totalUsers: total
      });
      
    } catch (error) {
      logger.error(`User list error: ${error.message}`);
      res.status(500).render('errors/500', {
        title: 'Server Error',
        message: error.message
      });
    }
  },
  
  /**
   * Get users list (API)
   * GET /api/admin/users
   */
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const skip = (page - 1) * limit;
      
      const query = {};
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          users,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            totalItems: total
          }
        }
      });
      
    } catch (error) {
      logger.error(`API user list error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Update user role
   * POST /admin/users/:id/role
   */
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Validate role
      const validRoles = ['user', 'admin'];
      if (!validRoles.includes(role)) {
        logger.warn(`Invalid role update attempt: ${role} by admin ${req.session.userId}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid role specified'
        });
      }
      
      // Prevent self-demotion
      if (id === req.session.userId && role !== 'admin') {
        logger.warn(`Admin ${req.session.userId} attempted to demote themselves`);
        return res.status(400).json({
          success: false,
          error: 'Cannot change your own role'
        });
      }
      
      // Update user
      const user = await User.findByIdAndUpdate(
        id,
        { role, updatedAt: new Date() },
        { new: true }
      ).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      logger.info(`Admin ${req.session.userId} changed role of user ${id} to ${role}`);
      
      // Check if it's an API or form request
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          message: `User role updated to ${role}`,
          data: { user }
        });
      }
      
      // Redirect for form submission
      res.redirect('/admin/users?success=role_updated');
      
    } catch (error) {
      logger.error(`Update role error: ${error.message}`);
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.redirect('/admin/users?error=update_failed');
    }
  },
  
  /**
   * Reset user password
   * POST /admin/users/:id/reset-password
   */
  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      
      // Generate temporary password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      
      // Find user and update password
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Update password (assuming User model has password hashing in pre-save)
      user.password = tempPassword;
      user.mustChangePassword = true;
      user.updatedAt = new Date();
      await user.save();
      
      logger.info(`Admin ${req.session.userId} reset password for user ${id}`);
      
      // Return temporary password (should be sent via email in production)
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          message: 'Password has been reset',
          data: { 
            tempPassword,
            note: 'This password should be sent to the user securely'
          }
        });
      }
      
      res.redirect('/admin/users?success=password_reset');
      
    } catch (error) {
      logger.error(`Reset password error: ${error.message}`);
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.redirect('/admin/users?error=reset_failed');
    }
  },
  
  /**
   * Toggle user status (enable/disable)
   * POST /admin/users/:id/toggle-status
   */
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent self-disable
      if (id === req.session.userId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot disable your own account'
        });
      }
      
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      user.isActive = !user.isActive;
      user.updatedAt = new Date();
      await user.save();
      
      const action = user.isActive ? 'enabled' : 'disabled';
      logger.info(`Admin ${req.session.userId} ${action} user ${id}`);
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          message: `User account ${action}`,
          data: { isActive: user.isActive }
        });
      }
      
      res.redirect('/admin/users?success=status_changed');
      
    } catch (error) {
      logger.error(`Toggle status error: ${error.message}`);
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.redirect('/admin/users?error=toggle_failed');
    }
  }
};

module.exports = UserAdminController;
