const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: true
  },
  age: Number,
  gender: String,
  symptoms: [String],
  vitals: {
    heartRate: Number,
    bloodPressure: String, // e.g., "120/80"
    temperature: Number,
    spo2: Number,
    respiratoryRate: Number
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String
  },
  status: {
    type: String,
    enum: ['pending', 'dispatching', 'on-scene', 'transporting', 'arrived', 'resolved'],
    default: 'pending'
  },
  triageAssessment: {
    severity: String, // e.g., 'Critical', 'Urgent', 'Stable'
    confidence: Number,
    recommendedAction: String,
    suggestedHospitals: [String]
  },
  assignedAmbulanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ambulance'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Emergency', emergencySchema);
