import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Cloud, 
  Droplets, 
  Thermometer, 
  AlertTriangle, 
  ArrowUpRight,
  Check,
  XCircle,
  WavesIcon
} from 'lucide-react-native';
import Assistant from '../../components/assistant';

const Home = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [fertilizerData, setFertilizerData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // Weather data
      const weatherResponse = await fetch('http://127.0.0.1:5002/weather');
      const weatherJson = await weatherResponse.json();
      setWeatherData(weatherJson);

      // Soil data
      const soilResponse = await fetch('http://127.0.0.1:5002/soil');
      const soilJson = await soilResponse.json();
      setSoilData(soilJson);

      // Fertilizer advice
      const fertilizerResponse = await fetch('http://127.0.0.1:5002/fertilizer-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crops: ['Rice']
        })
      });
      const fertilizerJson = await fertilizerResponse.json();
      setFertilizerData(fertilizerJson);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const kelvinToCelsius = (kelvin) => (kelvin - 273.15).toFixed(1);

  const renderNutrientStatus = (level) => {
    switch(level) {
      case 'low':
        return {
          icon: <XCircle size={20} color="#FF6B6B" />,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          status: 'Low'
        };
      case 'normal':
        return {
          icon: <Check size={20} color="#4ECB71" />,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          status: 'Optimal'
        };
      case 'high':
        return {
          icon: <ArrowUpRight size={20} color="#FFA726" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          status: 'High'
        };
      default:
        return {
          icon: <AlertTriangle size={20} color="#888" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          status: 'Unknown'
        };
    }
  };

  const renderHumidityWarning = () => {
    const humidity = weatherData?.humidity || 0;
    if (humidity > 40) {
      return (
        <View className="mb-4">
          {/* Humidity Warning Card */}
          <View className="bg-yellow-500/10 p-4 rounded-2xl mb-3 flex-row items-center border border-yellow-500/20">
            <WavesIcon size={24} color="#FFA726" className="mr-3" />
            <View className="flex-1">
              <Text className="text-yellow-500 font-pbold">High Humidity Alert</Text>
              <Text className="text-gray-300 text-sm">
                Current humidity is {humidity}%. High humidity can promote fungal growth. Consider using fungicides.
              </Text>
            </View>
          </View>

          {/* Fungicide Product Recommendations */}
          <Text className="text-white font-pmedium text-lg mb-3">Recommended Fungicides</Text>
          <View className="flex-row justify-between space-x-3">
            {/* Organic Fungicide Card */}
            <View className="flex-1 bg-[#131d2a] p-3 rounded-xl border border-[#00b890]/30">
              <Image 
                source={{uri: 'https://example.com/neem-oil.jpg'}} // Replace with actual image URL
                className="h-20 w-full rounded-lg mb-2 bg-gray-700"
                resizeMode="contain"
              />
              <Text className="text-white font-pbold text-sm mb-1">Neem Oil Concentrate</Text>
              <Text className="text-gray-400 text-xs mb-2">Organic Fungicide • 500ml</Text>
              <Text className="text-[#00b890] font-pbold text-base mb-2">₹349</Text>
              <TouchableOpacity className="bg-[#00b890] py-2 rounded-lg">
                <Text className="text-white text-center text-sm font-pmedium">Buy Now</Text>
              </TouchableOpacity>
            </View>

            {/* Chemical Fungicide Card */}
            <View className="flex-1 bg-[#131d2a] p-3 rounded-xl border border-[#00b890]/30">
              <Image 
                source={{uri: 'https://example.com/bavistin.jpg'}} // Replace with actual image URL
                className="h-20 w-full rounded-lg mb-2 bg-gray-700"
                resizeMode="contain"
              />
              <Text className="text-white font-pbold text-sm mb-1">Bavistin Fungicide</Text>
              <Text className="text-gray-400 text-xs mb-2">Systemic Protection • 250g</Text>
              <Text className="text-[#00b890] font-pbold text-base mb-2">₹599</Text>
              <TouchableOpacity className="bg-[#00b890] py-2 rounded-lg">
                <Text className="text-white text-center text-sm font-pmedium">Buy Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchData}
            colors={['#00b890']}
            tintColor="#00b890"
          />
        }
      >
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-pbold text-white">Farm Dashboard</Text>
          <Text className="text-gray-400">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {/* Weather Card */}
        <View className="bg-surface p-5 rounded-2xl mb-4 shadow-lg">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xl font-pbold text-white">Weather Conditions</Text>
            <View className="flex-row items-center">
              <Cloud size={20} color="#00b890" />
              <Text className="text-gray-400 ml-2 capitalize">
                {weatherData?.weather || 'Fetching...'}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Thermometer size={28} color="#00b890" />
              <Text className="text-white mt-2 text-lg">
                {kelvinToCelsius(weatherData?.temperature || 0)}°C
              </Text>
              <Text className="text-gray-400 text-sm">Temperature</Text>
            </View>
            <View className="items-center">
              <Droplets size={28} color="#00b890" />
              <Text className="text-white mt-2 text-lg">
                {weatherData?.humidity || 0}%
              </Text>
              <Text className="text-gray-400 text-sm">Humidity</Text>
            </View>
          </View>
        </View>

        {/* Humidity Warning */}
        {renderHumidityWarning()}

        {/* Soil Data Card */}
        <View className="bg-surface p-5 rounded-2xl mb-4 shadow-lg">
          <Text className="text-xl font-pbold text-white mb-3">Soil Conditions</Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Thermometer size={28} color="#00b890" />
              <Text className="text-white mt-2 text-lg">
                {kelvinToCelsius(soilData?.surface_temperature || 0)}°C
              </Text>
              <Text className="text-gray-400 text-sm">Surface Temp</Text>
            </View>
            <View className="items-center">
              <Droplets size={28} color="#00b890" />
              <Text className="text-white mt-2 text-lg">
                {((soilData?.soil_moisture || 0) * 100).toFixed(1)}%
              </Text>
              <Text className="text-gray-400 text-sm">Moisture</Text>
            </View>
          </View>
        </View>

        {/* NPK Levels Card */}
        <View className="bg-surface p-5 rounded-2xl mb-4 shadow-lg">
          <Text className="text-xl font-pbold text-white mb-4">Nutrient Levels</Text>
          <View className="flex-row">
            {['N', 'P', 'K'].map((nutrient) => {
              const status = renderNutrientStatus(fertilizerData?.classified_levels?.[nutrient]);
              return (
                <View 
                  key={nutrient} 
                  className={`flex-1 p-4 rounded-2xl mr-2 ${status.bgColor}`}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white font-pbold text-lg">{nutrient}</Text>
                    {status.icon}
                  </View>
                  <Text className="text-white text-2xl font-pbold">
                    {fertilizerData?.soil_npk_levels?.[nutrient] || 0}
                  </Text>
                  <Text className={`mt-1 text-sm ${status.color}`}>
                    {status.status} Level
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Crop Recommendations */}
        <View className="bg-surface p-5 rounded-2xl shadow-lg">
          <Text className="text-xl font-pbold text-white mb-4">Crop Recommendations</Text>
          {fertilizerData?.fertilizer_advice ? (
            Object.entries(fertilizerData.fertilizer_advice).map(([crop, advice]) => (
              <View key={crop} className="mb-4">
                <Text className="text-white font-pmedium text-lg mb-3">{crop}</Text>
                <View className="space-y-3">
                  {advice.map((item, index) => (
                    <View 
                      key={index} 
                      className="bg-[#00b890]/10 p-4 rounded-xl border border-[#00b890]/20"
                    >
                      <View className="flex-row items-start">
                        <AlertTriangle size={16} color="#00b890" className="mt-1 mr-2" />
                        <Text className="text-gray-300 flex-1">{item}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <Text className="text-gray-400 text-center">No recommendations available</Text>
          )}
        </View>
      </ScrollView>
      <Assistant/>
    </SafeAreaView>
  );
};

export default Home;