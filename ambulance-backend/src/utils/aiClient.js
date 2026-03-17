// Utility to connect to the Python AI service
const axios = require('axios'); // We need to install axios!

const AI_URL = process.env.AI_API_URL || 'http://localhost:8000/api';

const assessTriage = async (emergencyData) => {
  try {
    const response = await axios.post(`${AI_URL}/triage/assess`, emergencyData);
    return response.data;
  } catch (error) {
    console.error('Error communicating with AI Service:', error.message);
    throw error;
  }
};

module.exports = {
  assessTriage
};
