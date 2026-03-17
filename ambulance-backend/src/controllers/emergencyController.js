const Emergency = require('../models/Emergency');
const { assessTriage } = require('../utils/aiClient');

// Controller logic for handling emergency routes
const emergencyController = (io) => {
  return {
    
    // Create new emergency (and get AI triage)
    createEmergency: async (req, res) => {
      try {
        const { patientName, age, gender, symptoms, vitals, location } = req.body;

        // 1. Initial save to DB
        let newEmergency = new Emergency({ patientName, age, gender, symptoms, vitals, location });
        await newEmergency.save();

        // 2. Try to get AI assessment
        try {
          const aiResult = await assessTriage({
             case_id: newEmergency._id.toString(),
             patient_info: { age, gender },
             symptoms,
             vitals
          });
          
          // 3. Update DB with AI results
          newEmergency.triageAssessment = {
             severity: aiResult.severity || 'Unknown',
             confidence: aiResult.confidence || 0,
             recommendedAction: aiResult.recommended_action || '',
             suggestedHospitals: aiResult.suggested_hospitals || []
          };
          await newEmergency.save();

        } catch (aiError) {
           console.log("Could not fetch AI triage on creation. Resuming without AI.");
        }

        // 4. Broadcast the new emergency to dispatchers via Socket.IO
        io.to('dispatchers').emit('new_emergency', newEmergency);

        res.status(201).json(newEmergency);
      } catch (error) {
        res.status(500).json({ message: 'Error creating emergency', error: error.message });
      }
    },

    // Fetch all active emergencies for dashboard
    getAllEmergencies: async (req, res) => {
      try {
        const emergencies = await Emergency.find().sort({ createdAt: -1 });
        res.status(200).json(emergencies);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching emergencies' });
      }
    },

    // Update emergency status (e.g. from dispatcher or ambulance)
    updateStatus: async (req, res) => {
      try {
         const { status, assignedAmbulanceId } = req.body;
         const updated = await Emergency.findByIdAndUpdate(
            req.params.id, 
            { status, assignedAmbulanceId }, 
            { new: true }
         );

         if (!updated) return res.status(404).json({ message: 'Emergency not found' });

         // Broadcast update
         io.to('dispatchers').emit('emergency_updated', updated);

         res.status(200).json(updated);
      } catch (error) {
        res.status(500).json({ message: 'Error updating emergency' });
      }
    }
  };
};

module.exports = emergencyController;
