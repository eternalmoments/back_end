import { getStarChartService, getCelestialBodiesService } from '../services/starChartService.js';

export const getStarChart = async (req, res) => {
  const { date, latitude, longitude } = req.body;

  if (!date || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing required fields: date, latitude, or longitude' });
  }

  try {
    const data = await getStarChartService({ date, latitude, longitude });
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching star chart:', error);
    res.status(500).json({ error: 'Failed to fetch star chart' });
  }
};

export const getCelestialBodies = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Missing required field: date' });
  }

  try {
    const data = await getCelestialBodiesService(date);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching celestial bodies:', error.message);
    res.status(500).json({ error: 'Failed to fetch celestial bodies' });
  }
};
