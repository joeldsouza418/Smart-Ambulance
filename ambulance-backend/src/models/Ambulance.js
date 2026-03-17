const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true
  },
  currentLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'maintenance'],
    default: 'available'
  },
  activeEmergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency',
    default: null
  },
  personnel: [{
    name: String,
    role: String // e.g., 'Driver', 'Paramedic'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Ambulance', ambulanceSchema);
