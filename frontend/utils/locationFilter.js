// Function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Indian states and their approximate coordinates
const stateCoordinates = {
  'UP': { lat: 26.8467, lon: 80.9462 },
  'Maharashtra': { lat: 19.7515, lon: 75.7139 },
  'Karnataka': { lat: 15.3173, lon: 75.7139 },
  'Gujarat': { lat: 22.2587, lon: 71.1924 },
  'Rajasthan': { lat: 27.0238, lon: 74.2179 },
  // Add more states as needed
};

export function findNearestBanks(userLocation, allBanks) {
  // Get user's state based on coordinates
  let userState = null;
  let minDistance = Infinity;
  
  Object.entries(stateCoordinates).forEach(([state, coords]) => {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      coords.lat,
      coords.lon
    );
    if (distance < minDistance) {
      minDistance = distance;
      userState = state;
    }
  });

  // Score and sort banks based on multiple factors
  const scoredBanks = allBanks.map(bank => {
    let score = 0;
    
    // Check bank features for regional focus
    const features = bank.features.join(' ').toLowerCase();
    const type = bank.type.toLowerCase();
    
    // Higher score for banks in user's state
    if (features.includes(userState.toLowerCase())) {
      score += 10;
    }

    // Score based on bank type
    if (type.includes('regional rural banks')) {
      score += 5;
    } else if (type.includes('dccbs')) {
      score += 3;
    }

    // Score based on nationwide presence
    if (features.includes('nationwide') || features.includes('wide network')) {
      score += 2;
    }

    return { ...bank, score };
  });

  // Sort by score and return top 20
  return scoredBanks
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(bank => ({ ...bank, score: undefined })); // Remove score before returning
}