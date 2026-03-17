const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');

// We need to inject the `io` instance into our routes so controllers can broadcast events
module.exports = (io) => {
  const controller = emergencyController(io);

  // POST /api/emergencies - Create new case (triggers AI + Socket broadcast)
  router.post('/', controller.createEmergency);
  
  // GET /api/emergencies - Fetch all active cases
  router.get('/', controller.getAllEmergencies);

  // PUT /api/emergencies/:id/status - Update status
  router.put('/:id/status', controller.updateStatus);

  return router;
};
