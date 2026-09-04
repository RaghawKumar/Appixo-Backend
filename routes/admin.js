const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin authentication routes
router.post('/login', adminController.adminLogin);
router.post('/logout', adminController.adminLogout);
router.get('/profile', adminController.getAdminProfile);

// Admin enquiries management routes
router.get('/enquiries', adminController.getEnquiriesList);
router.get('/enquiries/:enquiryId', adminController.getEnquiryDetails);
router.put('/enquiries/:enquiryId/status', adminController.updateEnquiryStatus);

module.exports = router;
