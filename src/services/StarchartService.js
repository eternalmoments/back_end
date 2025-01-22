import axios from 'axios';

const API_ID = process.env.ASTRONOMY_API_ID;
const API_SECRET = process.env.ASTRONOMY_API_SECRET;
const BASE_URL = 'https://api.astronomyapi.com/api/v2';

const authString = Buffer.from(`${API_ID}:${API_SECRET}`).toString('base64');

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Basic ${authString}`,
  },
});

export const getStarChartService = async ({ date, latitude, longitude }) => {
    try {
 
      if (!date || typeof date !== 'string') {
        throw new Error('Invalid or missing date parameter');
      }
  
   
      const formattedDate = date.split('T')[0];
 
   
      const response = await api.post('/studio/star-chart', {
        style:"navy",
        observer: {
          latitude,
          longitude,
          date: formattedDate, // Use a data formatada
        },
        view: {
          type: 'area',
          parameters: {
            position: {
              equatorial: {
                rightAscension: 0,
                declination: 0,
              },
            },
            zoom: 2, // Opcional
          },
        },
      });
  
      const imageUrl = response.data?.data?.imageUrl;

      console.log("LOGANDO URL DA IMAGEM",imageUrl);
      
      if (!imageUrl) {
        throw new Error('No image URL in response');
      }
  
      return { imageUrl };
    } catch (error) {
      console.error('Error in getStarChartService:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch star chart');
    }
  };
  

export const getCelestialBodiesService = async (date) => {
  try {
    const response = await api.get('/bodies/positions', {
      params: {
        longitude: 0,
        latitude: 0,
        elevation: 0,
        from_date: date,
        to_date: date,
        time: '00:00:00',
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch celestial bodies');
  }
};
