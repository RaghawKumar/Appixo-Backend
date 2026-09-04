const express = require('express');
const router = express.Router();
const guestUserController = require('../controllers/guestUserController');

// Guest user routes
router.post('/register', guestUserController.registerGuestUser);
router.get('/profile/:guestId', guestUserController.getGuestProfile);
router.put('/profile/:guestId', guestUserController.updateGuestProfile);
router.delete('/profile/:guestId', guestUserController.deleteGuestUser);
router.get('/all', guestUserController.getAllGuestUsers);

module.exports = router;
